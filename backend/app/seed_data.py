"""Database seeding for development and demo purposes."""
import os
from datetime import datetime, timedelta
from typing import List

from .models import Account, PostingDB, GeoLocation, PickupWindow
from .repositories import account_repo, posting_repo

# Sample locations around University of Pennsylvania
SAMPLE_LOCATIONS = [
    {"lat": 39.9526, "lng": -75.1652, "name": "UPenn Campus"},
    {"lat": 39.9496, "lng": -75.1503, "name": "Rittenhouse Square"},
    {"lat": 39.9612, "lng": -75.1690, "name": "Fairmount"},
    {"lat": 39.9440, "lng": -75.1636, "name": "Graduate Hospital"},
    {"lat": 39.9567, "lng": -75.1795, "name": "Powelton Village"},
]

SAMPLE_FOOD_ITEMS = [
    {
        "title": "Leftover Pizza (4 slices)",
        "allergens": ["gluten", "dairy"],
        "quantity": "4 slices",
        "location_hint": "Library entrance",
        "impact": "Saves 2.5 lbs CO₂, helps a neighbor"
    },
    {
        "title": "Fresh Bagels (6 count)",
        "allergens": ["gluten"],
        "quantity": "6 bagels",
        "location_hint": "Coffee shop lobby",
        "impact": "Prevents food waste, feeds 2-3 people"
    },
    {
        "title": "Sealed Granola Bars",
        "allergens": ["nuts"],
        "quantity": "8 bars",
        "location_hint": "Gym entrance",
        "impact": "Nutritious snacks for students"
    },
    {
        "title": "Homemade Cookies (sealed)",
        "allergens": ["gluten", "dairy", "eggs"],
        "quantity": "12 cookies",
        "location_hint": "Dorm lobby",
        "impact": "Sweet treats, prevents waste"
    },
    {
        "title": "Fresh Fruit (apples)",
        "allergens": [],
        "quantity": "5 apples",
        "location_hint": "Cafeteria entrance",
        "impact": "Healthy snacks, zero waste"
    },
]

async def create_sample_accounts() -> List[Account]:
    """Create sample user accounts"""
    accounts = []
    
    sample_users = [
        {"name": "Alice Chen", "phone": "+1234567890", "auth0_id": "auth0|sample001"},
        {"name": "Bob Martinez", "phone": "+1234567891", "auth0_id": "auth0|sample002"},
        {"name": "Carol Kim", "phone": "+1234567892", "auth0_id": "auth0|sample003"},
        {"name": "David Wong", "phone": "+1234567893", "auth0_id": "auth0|sample004"},
        {"name": "Emma Johnson", "phone": "+1234567894", "auth0_id": "auth0|sample005"},
    ]
    
    for user_data in sample_users:
        # Check if account already exists
        existing = await account_repo.find_by_auth0_id(user_data["auth0_id"])
        if not existing:
            account = Account(
                auth0_id=user_data["auth0_id"],
                name=user_data["name"],
                phone=user_data["phone"],
                phone_verified=True,
                expo_push_tokens=[]
            )
            created_account = await account_repo.create_account(account)
            accounts.append(created_account)
        else:
            accounts.append(existing)
    
    return accounts

async def create_sample_postings(accounts: List[Account]) -> List[PostingDB]:
    """Create sample food postings"""
    postings = []
    
    for i, (account, location, food_item) in enumerate(zip(accounts, SAMPLE_LOCATIONS, SAMPLE_FOOD_ITEMS)):
        # Create pickup window (1-3 hours from now)
        now = datetime.utcnow()
        start_offset = timedelta(hours=1 + (i * 0.5))  # Stagger the times
        end_offset = timedelta(hours=3 + (i * 0.5))
        
        pickup_start = now + start_offset
        pickup_end = now + end_offset
        
        posting = PostingDB(
            owner_id=account.id,
            title=food_item["title"],
            allergens=food_item["allergens"],
            pickup_window=PickupWindow(start=pickup_start, end=pickup_end),
            location=GeoLocation(coordinates=[location["lng"], location["lat"]]),
            expires_at=pickup_end,
            quantity_label=food_item["quantity"],
            pickup_location_hint=food_item["location_hint"],
            impact_narrative=food_item["impact"],
            tags=["demo", "sample"],
            approx_geohash5=""  # Will be set by repository
        )
        
        created_posting = await posting_repo.create_posting(posting)
        postings.append(created_posting)
    
    return postings

async def seed_database():
    """Seed database with sample data for development/demo"""
    if os.getenv("SEED_DATABASE", "").lower() != "true":
        return
    
    print("🌱 Seeding database with sample data...")
    
    try:
        # Create sample accounts
        accounts = await create_sample_accounts()
        print(f"✅ Created {len(accounts)} sample accounts")
        
        # Create sample postings
        postings = await create_sample_postings(accounts)
        print(f"✅ Created {len(postings)} sample postings")
        
        print("🎉 Database seeding completed successfully!")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        raise
