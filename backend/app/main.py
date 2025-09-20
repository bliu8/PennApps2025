from typing import List, Optional, Literal
from uuid import uuid4
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .auth import Auth0User, get_current_user


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


app = FastAPI(title="Leftys API (Python)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


POSTINGS: List[Posting] = []
SCANS: List[ScanRecord] = []


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.get(f"{API_PREFIX}/postings", response_model=PostingsResponse)
def get_postings(current_user: Auth0User = Depends(get_current_user)) -> PostingsResponse:
    del current_user
    return PostingsResponse(postings=POSTINGS)


@app.post(f"{API_PREFIX}/postings", response_model=dict)
def create_posting(
    payload: CreatePostingPayload, current_user: Auth0User = Depends(get_current_user)
):
    del current_user
    posting = Posting(
        id=str(uuid4()),
        title=payload.title,
        quantityLabel=payload.quantityLabel,
        pickupWindowLabel=payload.pickupWindowLabel,
        pickupLocationHint=payload.pickupLocationHint or "",
        status="open",
        allergens=payload.allergens,
        socialProof=None,
        reserverCount=0,
        distanceKm=None,
        coordinates=None,
        createdAt=now_iso(),
        impactNarrative=payload.impactNarrative,
        tags=payload.tags or [],
    )
    POSTINGS.insert(0, posting)
    return {"posting": posting}


@app.get(f"{API_PREFIX}/impact", response_model=ImpactResponse)
def get_impact(current_user: Auth0User = Depends(get_current_user)) -> ImpactResponse:
    del current_user
    metrics = [
        ImpactMetric(id="neighbors-helped", label="Neighbors helped", value="12", helperText="Up 3 this month — keep the momentum! ❤️", icon="heart.fill"),
        ImpactMetric(id="waste-avoided", label="Waste avoided", value="18 lbs", helperText="Equals ~36 meals redirected.", icon="leaf.fill"),
        ImpactMetric(id="wins-this-week", label="Quick pickup streak", value="4", helperText="Average pickup time: 22 minutes.", icon="sparkles"),
    ]
    return ImpactResponse(metrics=metrics, source="fallback")


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
def get_scans(current_user: Auth0User = Depends(get_current_user)) -> ScansResponse:
    del current_user
    return ScansResponse(scans=SCANS)


@app.post(f"{API_PREFIX}/scans", response_model=dict)
async def upload_scan(
    image: UploadFile = File(...), current_user: Auth0User = Depends(get_current_user)
):
    del current_user
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if image.content_type not in allowed:
        from fastapi import HTTPException

        raise HTTPException(status_code=400, detail="Only jpeg/png/webp are allowed")

    scan = ScanRecord(
        id=str(uuid4()),
        title="Uploaded item",
        allergens=[],
        expiryDate=None,
        rawText=f"Uploaded file: {image.filename}",
        notes=None,
        mimeType=image.content_type,
        createdAt=now_iso(),
    )
    SCANS.insert(0, scan)
    return {"scan": scan}


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


@app.get("/health")
def health():
    return {"ok": True}


