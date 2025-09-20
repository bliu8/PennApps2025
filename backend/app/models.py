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
