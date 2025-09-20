"""Utility functions for data transformation and formatting."""
from datetime import datetime
from typing import Optional
from math import radians, cos, sin, asin, sqrt

from .models import PostingDB, Posting, Coordinates, ScanRecordDB, ScanRecord

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points on earth in kilometers"""
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371  # Radius of earth in kilometers
    return c * r

def format_pickup_window(start: datetime, end: datetime) -> str:
    """Format pickup window for display"""
    start_str = start.strftime("%I:%M %p")
    end_str = end.strftime("%I:%M %p")
    return f"{start_str} - {end_str}"

def posting_db_to_api(
    posting_db: PostingDB, 
    user_lat: Optional[float] = None, 
    user_lng: Optional[float] = None,
    is_owner: bool = False,
    is_claimer: bool = False
) -> Posting:
    """Convert database posting to API response format"""
    
    # Calculate distance if user location provided
    distance_km = None
    if user_lat is not None and user_lng is not None:
        posting_lat = posting_db.location.coordinates[1]
        posting_lng = posting_db.location.coordinates[0]
        distance_km = haversine_distance(user_lat, user_lng, posting_lat, posting_lng)
    
    # Show exact coordinates only to owner or accepted claimer
    coordinates = None
    if is_owner or is_claimer:
        coordinates = Coordinates(
            latitude=posting_db.location.coordinates[1],
            longitude=posting_db.location.coordinates[0]
        )
    
    # Format pickup window
    pickup_window_label = None
    if posting_db.pickup_window:
        pickup_window_label = format_pickup_window(
            posting_db.pickup_window.start,
            posting_db.pickup_window.end
        )
    
    return Posting(
        id=str(posting_db.id),
        title=posting_db.title,
        quantityLabel=posting_db.quantity_label or "1 item",
        pickupWindowLabel=pickup_window_label,
        pickupLocationHint=posting_db.pickup_location_hint or "",
        status=posting_db.status if posting_db.status != "picked_up" else "reserved",
        allergens=posting_db.allergens,
        socialProof=None,  # TODO: Implement social proof logic
        reserverCount=None,  # TODO: Count claims
        distanceKm=round(distance_km, 1) if distance_km else None,
        coordinates=coordinates,
        createdAt=posting_db.created_at.isoformat(),
        impactNarrative=posting_db.impact_narrative,
        tags=posting_db.tags
    )

def scan_db_to_api(scan_db: ScanRecordDB) -> ScanRecord:
    """Convert database scan to API response format"""
    return ScanRecord(
        id=str(scan_db.id),
        title=scan_db.title,
        allergens=scan_db.allergens,
        expiryDate=scan_db.expiry_date.isoformat() if scan_db.expiry_date else None,
        rawText=scan_db.raw_text,
        notes=scan_db.notes,
        mimeType=scan_db.mime_type,
        createdAt=scan_db.created_at.isoformat()
    )

def get_impact_narrative(allergens: list, quantity: str = "1 item") -> str:
    """Generate impact narrative for posting"""
    base_messages = [
        f"Redirects {quantity} from waste",
        f"Saves ~2.5 lbs CO₂ equivalent",
        f"Helps a neighbor nearby"
    ]
    
    if "dairy" in allergens:
        base_messages.append("Prevents dairy waste")
    if "gluten" in allergens:
        base_messages.append("Reduces food packaging waste")
    
    return " • ".join(base_messages[:2])  # Keep it concise
