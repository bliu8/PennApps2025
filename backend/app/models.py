"""MongoDB data models for Leftys application."""
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, _info=None):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler):
        json_schema = handler(core_schema)
        json_schema.update(type="string")
        return json_schema

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

class GeoLocation(BaseModel):
    type: str = "Point"
    coordinates: List[float] = Field(..., description="[longitude, latitude]")

class PickupWindow(BaseModel):
    start: datetime
    end: datetime

class Account(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    auth0_id: str
    name: Optional[str] = None
    phone: str
    phone_verified: bool = False
    expo_push_tokens: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    strikes: int = 0
    banned: bool = False
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class PostingDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    owner_id: PyObjectId
    title: str
    allergens: List[Allergen] = []
    picture_url: Optional[str] = None
    pickup_window: PickupWindow
    location: GeoLocation
    approx_geohash5: str
    status: Literal["open", "reserved", "picked_up", "expired", "canceled"] = "open"
    claimed_by: Optional[PyObjectId] = None
    claim_deadline: Optional[datetime] = None
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Additional fields for API compatibility
    quantity_label: Optional[str] = None
    pickup_location_hint: Optional[str] = None
    impact_narrative: Optional[str] = None
    tags: List[str] = []
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Claim(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    posting_id: PyObjectId
    claimer_id: PyObjectId
    status: Literal["pending", "accepted", "expired", "rejected"] = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    accepted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Message(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    posting_id: PyObjectId
    sender_id: PyObjectId
    text: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ScanRecordDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    owner_id: PyObjectId
    title: str
    allergens: List[Allergen] = []
    expiry_date: Optional[datetime] = None
    raw_text: str
    notes: Optional[str] = None
    mime_type: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

Unit = Literal["g", "kg", "oz", "lb", "ml", "L", "pieces"]

class InventoryItemDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    owner_id: PyObjectId
    name: str
    quantity: float
    base_unit: Unit
    display_unit: Optional[str] = None  # e.g., 'tub', 'carton', 'clamshell'
    units_per_display: Optional[float] = None  # how many base units per display unit
    input_date: datetime
    est_expiry_date: datetime
    remaining_quantity: float  # Tracks how much is left after consumption
    status: Literal["active", "consumed", "expired", "discarded"] = "active"
    cost_estimate: Optional[float] = None
    used_at: Optional[datetime] = None
    discarded_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class UserMetrics(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    owner_id: PyObjectId
    co2_emissions_prevented_kg: float = 0.0  # CO2 in kg prevented
    food_saved_lbs: float = 0.0  # Food saved in lbs
    money_saved_usd: float = 0.0  # Money saved in USD
    meals_created: int = 0  # Number of meals created from inventory
    items_rescued: int = 0  # Items used before expiry
    streak_days: int = 0  # Current daily usage streak
    badges: List[str] = []  # Achievement badges
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# API Response models (for FastAPI endpoints)
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

class ScanRecord(BaseModel):
    id: str
    title: str
    allergens: List[Allergen]
    expiryDate: Optional[str] = None
    rawText: str
    notes: Optional[str] = None
    mimeType: Optional[str] = None
    createdAt: str

class InventoryItem(BaseModel):
    id: str
    name: str
    quantity: float
    baseUnit: Unit
    displayUnit: Optional[str] = None
    unitsPerDisplay: Optional[float] = None
    input_date: str  # ISO format
    est_expiry_date: str  # ISO format
