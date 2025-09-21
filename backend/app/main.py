from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

from fastapi import Depends, FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .auth import Auth0User, get_current_user
from .database import connect_to_mongo, close_mongo_connection
from .models import PostingDB, GeoLocation, PickupWindow, ScanRecordDB, Account, InventoryItemDB
from .repositories import account_repo, posting_repo, scan_repo, inventory_repo, user_metrics_repo
from .utils import posting_db_to_api, scan_db_to_api, get_impact_narrative, inventory_db_to_api, calculate_food_waste_impact

# Load environment variables
load_dotenv()  # This will load from backend/.env automatically


API_PREFIX = "/api"


Allergen = Literal[
    "gluten",
    "dairy",
    "nuts",
    "peanuts",
    "soy",
    "eggs",
    "fish",
    "shellfish",
    "sesame",
]


class Coordinates(BaseModel):
    latitude: float
    longitude: float


class Posting(BaseModel):
    id: str
    title: str
    quantityLabel: str
    pickupWindowLabel: Optional[str] = None
    pickupLocationHint: str
    status: Literal["open", "reserved", "draft"]
    allergens: List[Allergen]
    socialProof: Optional[str] = None
    reserverCount: Optional[int] = None
    distanceKm: Optional[float] = None
    coordinates: Optional[Coordinates] = None
    createdAt: str
    impactNarrative: Optional[str] = None
    tags: Optional[List[str]] = None


class PostingsResponse(BaseModel):
    postings: List[Posting]


class CreatePostingPayload(BaseModel):
    title: str
    quantityLabel: str
    pickupWindowLabel: Optional[str] = None
    pickupLocationHint: Optional[str] = None
    allergens: List[Allergen]
    impactNarrative: Optional[str] = None
    tags: Optional[List[str]] = None


class ImpactMetric(BaseModel):
    id: str
    label: str
    value: str
    helperText: str
    icon: Literal["heart.fill", "sparkles", "leaf.fill"]


class ImpactResponse(BaseModel):
    metrics: List[ImpactMetric]
    source: Literal["live", "fallback"]


class AiNudge(BaseModel):
    id: str
    headline: str
    supportingCopy: str
    defaultLabel: str


class NudgesResponse(BaseModel):
    nudges: List[AiNudge]
    source: Literal["live", "fallback"]


class ScanRecord(BaseModel):
    id: str
    title: str
    allergens: List[Allergen]
    expiryDate: Optional[str] = None
    rawText: str
    notes: Optional[str] = None
    mimeType: Optional[str] = None
    createdAt: str


class ScansResponse(BaseModel):
    scans: List[ScanRecord]


class ListingAssistPayload(BaseModel):
    title: Optional[str] = None
    quantityLabel: Optional[str] = None
    allergens: Optional[List[Allergen]] = None
    notes: Optional[str] = None
    expiryDate: Optional[str] = None


class ListingAssistantSuggestion(BaseModel):
    titleSuggestion: str
    quantityLabel: str
    pickupWindowLabel: str
    pickupLocationHint: str
    impactNarrative: str
    tags: List[str]


class ListingAssistantResponse(BaseModel):
    suggestion: ListingAssistantSuggestion
    source: Literal["live", "fallback"]

class CreateInventoryItemPayload(BaseModel):
    name: str
    quantity: float
    baseUnit: Literal["g", "kg", "oz", "lb", "ml", "L", "pieces"]
    displayUnit: Optional[str] = None
    unitsPerDisplay: Optional[float] = None
    est_expiry_date: str  # ISO format
    costEstimate: Optional[float] = None

class InventoryItemsResponse(BaseModel):
    items: List[dict]

class UpdateQuantityPayload(BaseModel):
    quantity: float

class ConsumeItemPayload(BaseModel):
    quantity_delta: float
    reason: Literal["used", "discarded"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    
    # Seed database if enabled
    from .seed_data import seed_database
    await seed_database()
    
    yield
    
    # Shutdown
    await close_mongo_connection()

app = FastAPI(title="Leftys API (Python)", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

async def get_or_create_account(current_user: Auth0User) -> Account:
    """Get existing account or create new one for Auth0 user"""
    account = await account_repo.find_by_auth0_id(current_user.sub)
    if not account:
        # Create new account
        account = Account(
            auth0_id=current_user.sub,
            name=current_user.name,
            phone="",  # Will need to be set separately
            phone_verified=False
        )
        account = await account_repo.create_account(account)
    return account


@app.get(f"{API_PREFIX}/postings", response_model=PostingsResponse)
async def get_postings(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_km: float = 2.0,
    current_user: Auth0User = Depends(get_current_user)
) -> PostingsResponse:
    account = await get_or_create_account(current_user)
    
    # Get nearby postings if location provided, otherwise get recent postings
    if lat is not None and lng is not None:
        postings_db = await posting_repo.find_nearby(lat, lng, radius_km)
    else:
        # Fallback: get recent postings (you might want to implement this differently)
        postings_db = []
    
    # Convert to API format
    postings = []
    for posting_db in postings_db:
        is_owner = posting_db.owner_id == account.id
        is_claimer = posting_db.claimed_by == account.id
        posting_api = posting_db_to_api(
            posting_db, 
            lat, lng, 
            is_owner=is_owner, 
            is_claimer=is_claimer
        )
        postings.append(posting_api)
    
    return PostingsResponse(postings=postings)


@app.post(f"{API_PREFIX}/postings", response_model=dict)
async def create_posting(
    payload: CreatePostingPayload, 
    lat: float,
    lng: float,
    current_user: Auth0User = Depends(get_current_user)
):
    account = await get_or_create_account(current_user)
    
    # Check if user has reached posting limit
    open_count = await posting_repo.count_open_by_owner(account.id)
    if open_count >= 3:
        raise HTTPException(status_code=400, detail="Maximum 3 open postings allowed")
    
    # Create pickup window (default to 2 hours from now)
    now = datetime.utcnow()
    pickup_start = now + timedelta(hours=1)
    pickup_end = now + timedelta(hours=3)
    
    # Create posting
    posting_db = PostingDB(
        owner_id=account.id,
        title=payload.title,
        allergens=payload.allergens,
        pickup_window=PickupWindow(start=pickup_start, end=pickup_end),
        location=GeoLocation(coordinates=[lng, lat]),  # [longitude, latitude]
        expires_at=pickup_end,
        quantity_label=payload.quantityLabel,
        pickup_location_hint=payload.pickupLocationHint or "",
        impact_narrative=payload.impactNarrative or get_impact_narrative(payload.allergens, payload.quantityLabel),
        tags=payload.tags or [],
        approx_geohash5=""  # Will be set by repository
    )
    
    # Save to database
    created_posting = await posting_repo.create_posting(posting_db)
    
    # Convert to API format
    posting_api = posting_db_to_api(created_posting, lat, lng, is_owner=True)
    
    return {"posting": posting_api}


@app.get(f"{API_PREFIX}/impact", response_model=ImpactResponse)
async def get_impact(current_user: Auth0User = Depends(get_current_user)) -> ImpactResponse:
    account = await get_or_create_account(current_user)
    user_metrics = await user_metrics_repo.get_or_create_metrics(account.id)
    
    metrics = [
        ImpactMetric(
            id="food-saved", 
            label="Food saved", 
            value=f"{user_metrics.food_saved_lbs:.1f} lbs", 
            helperText=f"Equivalent to ~{int(user_metrics.food_saved_lbs * 2)} meals rescued from waste! 🍽️", 
            icon="leaf.fill"
        ),
        ImpactMetric(
            id="co2-prevented", 
            label="CO₂ prevented", 
            value=f"{user_metrics.co2_emissions_prevented_kg:.1f} kg", 
            helperText="Your food rescue efforts are making a real climate impact! 🌍", 
            icon="sparkles"
        ),
        ImpactMetric(
            id="money-saved", 
            label="Money saved", 
            value=f"${user_metrics.money_saved_usd:.0f}", 
            helperText=f"From {user_metrics.items_rescued} items rescued before expiry.", 
            icon="heart.fill"
        ),
    ]
    
    return ImpactResponse(metrics=metrics, source="live")


@app.get(f"{API_PREFIX}/nudges", response_model=NudgesResponse)
def get_nudges(
    count: Optional[int] = None,
    persona: Optional[str] = None,
    focus: Optional[str] = None,
    current_user: Auth0User = Depends(get_current_user),
) -> NudgesResponse:
    del count, persona, focus
    del current_user
    nudges = [
        AiNudge(id="default-window", headline="Default to a 30-minute pickup window", supportingCopy="It keeps momentum high and matches what most neighbors expect.", defaultLabel="Suggested: 30 min window"),
        AiNudge(id="location-hint", headline="Pick a public handoff spot upfront", supportingCopy="Library entrances, grocery foyers, and lobbies feel safest for everyone.", defaultLabel="Popular: Public lobby shelves"),
    ]
    return NudgesResponse(nudges=nudges, source="fallback")


@app.get(f"{API_PREFIX}/scans", response_model=ScansResponse)
async def get_scans(current_user: Auth0User = Depends(get_current_user)) -> ScansResponse:
    account = await get_or_create_account(current_user)
    scans_db = await scan_repo.find_by_owner(account.id)
    
    scans = [scan_db_to_api(scan_db) for scan_db in scans_db]
    return ScansResponse(scans=scans)


@app.post(f"{API_PREFIX}/scans", response_model=dict)
async def upload_scan(
    image: UploadFile = File(...), current_user: Auth0User = Depends(get_current_user)
):
    account = await get_or_create_account(current_user)
    
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if image.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only jpeg/png/webp are allowed")

    # Create scan record
    scan_db = ScanRecordDB(
        owner_id=account.id,
        title="Uploaded item",
        allergens=[],
        expiry_date=None,
        raw_text=f"Uploaded file: {image.filename}",
        notes=None,
        mime_type=image.content_type
    )
    
    # Save to database
    created_scan = await scan_repo.create_scan(scan_db)
    
    # Convert to API format
    scan_api = scan_db_to_api(created_scan)
    
    return {"scan": scan_api}


@app.post(f"{API_PREFIX}/ai/listing-assistant", response_model=ListingAssistantResponse)
def listing_assistant(
    payload: ListingAssistPayload, current_user: Auth0User = Depends(get_current_user)
) -> ListingAssistantResponse:
    del current_user
    title = payload.title or "Leftover item"
    quantity = payload.quantityLabel or "1 item"
    suggestion = ListingAssistantSuggestion(
        titleSuggestion=title,
        quantityLabel=quantity,
        pickupWindowLabel="30 min window",
        pickupLocationHint="Public lobby",
        impactNarrative="Redirects a meal from waste",
        tags=["quick-pickup"],
    )
    return ListingAssistantResponse(suggestion=suggestion, source="fallback")


# INVENTORY ENDPOINTS

@app.get(f"{API_PREFIX}/inventory", response_model=InventoryItemsResponse)
async def get_inventory(current_user: Auth0User = Depends(get_current_user)) -> InventoryItemsResponse:
    account = await get_or_create_account(current_user)
    items_db = await inventory_repo.find_by_owner(account.id, status="active")
    items = [inventory_db_to_api(item_db).dict() for item_db in items_db]
    return InventoryItemsResponse(items=items)

@app.post(f"{API_PREFIX}/inventory", response_model=dict)
async def create_inventory_item(
    payload: CreateInventoryItemPayload,
    current_user: Auth0User = Depends(get_current_user)
):
    account = await get_or_create_account(current_user)
    
    # Parse expiry date
    est_expiry_date = datetime.fromisoformat(payload.est_expiry_date.replace('Z', '+00:00'))
    
    # Create inventory item
    item_db = InventoryItemDB(
        owner_id=account.id,
        name=payload.name,
        quantity=payload.quantity,
        base_unit=payload.baseUnit,
        display_unit=payload.displayUnit,
        units_per_display=payload.unitsPerDisplay,
        input_date=datetime.utcnow(),
        est_expiry_date=est_expiry_date,
        cost_estimate=payload.costEstimate
    )
    
    created_item = await inventory_repo.create_item(item_db)
    item_api = inventory_db_to_api(created_item)
    
    return {"item": item_api.dict()}

@app.patch(f"{API_PREFIX}/inventory/{{item_id}}", response_model=dict)
async def update_inventory_quantity(
    item_id: str,
    payload: UpdateQuantityPayload,
    current_user: Auth0User = Depends(get_current_user)
):
    account = await get_or_create_account(current_user)
    
    try:
        item_object_id = ObjectId(item_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid item ID")
    
    # Verify ownership
    item = await inventory_repo.find_by_id(item_object_id)
    if not item or item.owner_id != account.id:
        raise HTTPException(status_code=404, detail="Item not found")
    
    success = await inventory_repo.update_quantity(item_object_id, payload.quantity)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update quantity")
    
    updated_item = await inventory_repo.find_by_id(item_object_id)
    return {"item": inventory_db_to_api(updated_item).dict()}

@app.post(f"{API_PREFIX}/inventory/{{item_id}}/consume", response_model=dict)
async def consume_inventory_item(
    item_id: str,
    payload: ConsumeItemPayload,
    current_user: Auth0User = Depends(get_current_user)
):
    account = await get_or_create_account(current_user)
    
    try:
        item_object_id = ObjectId(item_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid item ID")
    
    # Verify ownership
    item = await inventory_repo.find_by_id(item_object_id)
    if not item or item.owner_id != account.id:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Calculate impact before consumption
    impact = calculate_food_waste_impact(item, payload.reason)
    
    updated_item = await inventory_repo.consume_item(
        item_object_id, 
        payload.quantity_delta, 
        payload.reason
    )
    
    if not updated_item:
        raise HTTPException(status_code=400, detail="Failed to consume item")
    
    # Update user metrics if item was used (not discarded)
    if payload.reason == "used":
        await user_metrics_repo.update_metrics(
            account.id,
            co2_prevented=impact["co2_prevented_kg"],
            food_saved=impact["food_saved_lbs"],
            money_saved=impact["money_saved_usd"],
            items_rescued_added=1 if updated_item.status == "consumed" else 0
        )
    
    return {"item": inventory_db_to_api(updated_item).dict()}

@app.delete(f"{API_PREFIX}/inventory/{{item_id}}", response_model=dict)
async def delete_inventory_item(
    item_id: str,
    current_user: Auth0User = Depends(get_current_user)
):
    account = await get_or_create_account(current_user)
    
    try:
        item_object_id = ObjectId(item_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid item ID")
    
    # Verify ownership
    item = await inventory_repo.find_by_id(item_object_id)
    if not item or item.owner_id != account.id:
        raise HTTPException(status_code=404, detail="Item not found")
    
    success = await inventory_repo.delete_item(item_object_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete item")
    
    return {"success": True}

@app.get("/health")
def health():
    return {"ok": True}


