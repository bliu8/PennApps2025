"""Repository classes for MongoDB operations."""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection
import geohash
from math import radians, cos, sin, asin, sqrt

from .database import get_database
from .models import Account, PostingDB, Claim, Message, ScanRecordDB, GeoLocation, InventoryItemDB, UserMetrics, RecipeDB

class BaseRepository:
    def __init__(self, collection_name: str):
        self.collection_name = collection_name
    
    @property
    def collection(self) -> AsyncIOMotorCollection:
        db = get_database()
        return db[self.collection_name]

class AccountRepository(BaseRepository):
    def __init__(self):
        super().__init__("accounts")
    
    async def create_account(self, account: Account) -> Account:
        result = await self.collection.insert_one(account.dict(by_alias=True))
        account.id = result.inserted_id
        return account
    
    async def find_by_auth0_id(self, auth0_id: str) -> Optional[Account]:
        doc = await self.collection.find_one({"auth0_id": auth0_id})
        return Account(**doc) if doc else None
    
    async def find_by_phone(self, phone: str) -> Optional[Account]:
        doc = await self.collection.find_one({"phone": phone})
        return Account(**doc) if doc else None
    
    async def find_by_id(self, account_id: ObjectId) -> Optional[Account]:
        doc = await self.collection.find_one({"_id": account_id})
        return Account(**doc) if doc else None
    
    async def update_expo_tokens(self, account_id: ObjectId, tokens: List[str]) -> bool:
        result = await self.collection.update_one(
            {"_id": account_id},
            {"$set": {"expo_push_tokens": tokens}}
        )
        return result.modified_count > 0

class PostingRepository(BaseRepository):
    def __init__(self):
        super().__init__("postings")
    
    async def create_posting(self, posting: PostingDB) -> PostingDB:
        # Generate geohash for approximate location
        lat, lng = posting.location.coordinates[1], posting.location.coordinates[0]
        posting.approx_geohash5 = geohash.encode(lat, lng, precision=5)
        
        result = await self.collection.insert_one(posting.dict(by_alias=True))
        posting.id = result.inserted_id
        return posting
    
    async def find_nearby(
        self, 
        lat: float, 
        lng: float, 
        radius_km: float = 2.0,
        status: str = "open",
        limit: int = 50
    ) -> List[PostingDB]:
        # Convert km to meters for MongoDB
        radius_meters = radius_km * 1000
        
        query = {
            "location": {
                "$near": {
                    "$geometry": {
                        "type": "Point",
                        "coordinates": [lng, lat]  # [longitude, latitude]
                    },
                    "$maxDistance": radius_meters
                }
            },
            "status": status,
            "expires_at": {"$gt": datetime.utcnow()}
        }
        
        cursor = self.collection.find(query).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [PostingDB(**doc) for doc in docs]
    
    async def find_by_id(self, posting_id: ObjectId) -> Optional[PostingDB]:
        doc = await self.collection.find_one({"_id": posting_id})
        return PostingDB(**doc) if doc else None
    
    async def find_by_owner(self, owner_id: ObjectId, status: Optional[str] = None) -> List[PostingDB]:
        query = {"owner_id": owner_id}
        if status:
            query["status"] = status
        
        cursor = self.collection.find(query).sort("created_at", -1)
        docs = await cursor.to_list(length=None)
        return [PostingDB(**doc) for doc in docs]
    
    async def update_status(
        self, 
        posting_id: ObjectId, 
        status: str,
        claimed_by: Optional[ObjectId] = None,
        claim_deadline: Optional[datetime] = None
    ) -> bool:
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow()
        }
        
        if claimed_by is not None:
            update_data["claimed_by"] = claimed_by
        if claim_deadline is not None:
            update_data["claim_deadline"] = claim_deadline
            
        result = await self.collection.update_one(
            {"_id": posting_id},
            {"$set": update_data}
        )
        return result.modified_count > 0
    
    async def count_open_by_owner(self, owner_id: ObjectId) -> int:
        return await self.collection.count_documents({
            "owner_id": owner_id,
            "status": "open"
        })
    
    async def get_expired_postings(self) -> List[PostingDB]:
        """Get postings that should be expired"""
        cursor = self.collection.find({
            "status": {"$in": ["open", "reserved"]},
            "expires_at": {"$lt": datetime.utcnow()}
        })
        docs = await cursor.to_list(length=None)
        return [PostingDB(**doc) for doc in docs]

class ClaimRepository(BaseRepository):
    def __init__(self):
        super().__init__("claims")
    
    async def create_claim(self, claim: Claim) -> Claim:
        result = await self.collection.insert_one(claim.dict(by_alias=True))
        claim.id = result.inserted_id
        return claim
    
    async def find_by_posting(self, posting_id: ObjectId) -> List[Claim]:
        cursor = self.collection.find({"posting_id": posting_id}).sort("created_at", 1)
        docs = await cursor.to_list(length=None)
        return [Claim(**doc) for doc in docs]
    
    async def find_active_by_claimer(self, claimer_id: ObjectId) -> Optional[Claim]:
        """Find claimer's current active (accepted) claim"""
        doc = await self.collection.find_one({
            "claimer_id": claimer_id,
            "status": "accepted"
        })
        return Claim(**doc) if doc else None
    
    async def update_status(self, claim_id: ObjectId, status: str) -> bool:
        update_data = {"status": status}
        if status == "accepted":
            update_data["accepted_at"] = datetime.utcnow()
            update_data["expires_at"] = datetime.utcnow() + timedelta(minutes=45)
        
        result = await self.collection.update_one(
            {"_id": claim_id},
            {"$set": update_data}
        )
        return result.modified_count > 0
    
    async def get_expired_claims(self) -> List[Claim]:
        """Get claims that should be expired"""
        cursor = self.collection.find({
            "status": "accepted",
            "expires_at": {"$lt": datetime.utcnow()}
        })
        docs = await cursor.to_list(length=None)
        return [Claim(**doc) for doc in docs]

class MessageRepository(BaseRepository):
    def __init__(self):
        super().__init__("messages")
    
    async def create_message(self, message: Message) -> Message:
        result = await self.collection.insert_one(message.dict(by_alias=True))
        message.id = result.inserted_id
        return message
    
    async def find_by_posting(self, posting_id: ObjectId, limit: int = 50) -> List[Message]:
        cursor = self.collection.find({"posting_id": posting_id}).sort("created_at", 1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [Message(**doc) for doc in docs]

class ScanRepository(BaseRepository):
    def __init__(self):
        super().__init__("scans")
    
    async def create_scan(self, scan: ScanRecordDB) -> ScanRecordDB:
        result = await self.collection.insert_one(scan.dict(by_alias=True))
        scan.id = result.inserted_id
        return scan
    
    async def find_by_owner(self, owner_id: ObjectId, limit: int = 50) -> List[ScanRecordDB]:
        cursor = self.collection.find({"owner_id": owner_id}).sort("created_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [ScanRecordDB(**doc) for doc in docs]

class InventoryRepository(BaseRepository):
    def __init__(self):
        super().__init__("inventory_items")
    
    async def create_item(self, item: InventoryItemDB) -> InventoryItemDB:
        item.remaining_quantity = item.quantity  # Initially, remaining equals total
        result = await self.collection.insert_one(item.dict(by_alias=True))
        item.id = result.inserted_id
        return item
    
    async def find_by_owner(self, owner_id: ObjectId, status: str = "active") -> List[InventoryItemDB]:
        query = {"owner_id": owner_id}
        if status:
            query["status"] = status
        
        cursor = self.collection.find(query).sort("est_expiry_date", 1)  # Sort by expiry date
        docs = await cursor.to_list(length=None)
        return [InventoryItemDB(**doc) for doc in docs]
    
    async def find_by_id(self, item_id: ObjectId) -> Optional[InventoryItemDB]:
        doc = await self.collection.find_one({"_id": item_id})
        return InventoryItemDB(**doc) if doc else None
    
    async def update_quantity(self, item_id: ObjectId, new_quantity: float) -> bool:
        result = await self.collection.update_one(
            {"_id": item_id},
            {
                "$set": {
                    "quantity": new_quantity,
                    "remaining_quantity": new_quantity,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0
    
    async def consume_item(
        self, 
        item_id: ObjectId, 
        quantity_delta: float, 
        reason: str = "used"
    ) -> Optional[InventoryItemDB]:
        # Get current item
        item = await self.find_by_id(item_id)
        if not item:
            return None
        
        new_remaining = max(0, item.remaining_quantity - quantity_delta)
        update_data = {
            "remaining_quantity": new_remaining,
            "quantity": new_remaining,  # Also update quantity to match remaining
            "updated_at": datetime.utcnow()
        }
        
        # If item is fully consumed, update status and timestamp
        if new_remaining <= 0:
            if reason == "used":
                update_data["status"] = "consumed"
                update_data["used_at"] = datetime.utcnow()
            else:  # discarded
                update_data["status"] = "discarded"
                update_data["discarded_at"] = datetime.utcnow()
        
        result = await self.collection.update_one(
            {"_id": item_id},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await self.find_by_id(item_id)
        return None
    
    async def delete_item(self, item_id: ObjectId) -> bool:
        result = await self.collection.delete_one({"_id": item_id})
        return result.deleted_count > 0
    
    async def find_expiring_soon(
        self, 
        owner_id: ObjectId, 
        days_ahead: int = 3
    ) -> List[InventoryItemDB]:
        """Find items expiring within the next N days"""
        cutoff_date = datetime.utcnow() + timedelta(days=days_ahead)
        
        query = {
            "owner_id": owner_id,
            "status": "active",
            "est_expiry_date": {"$lte": cutoff_date}
        }
        
        cursor = self.collection.find(query).sort("est_expiry_date", 1)
        docs = await cursor.to_list(length=None)
        return [InventoryItemDB(**doc) for doc in docs]

class UserMetricsRepository(BaseRepository):
    def __init__(self):
        super().__init__("user_metrics")
    
    async def get_or_create_metrics(self, owner_id: ObjectId) -> UserMetrics:
        doc = await self.collection.find_one({"owner_id": owner_id})
        if doc:
            return UserMetrics(**doc)
        
        # Create new metrics for user
        metrics = UserMetrics(owner_id=owner_id)
        result = await self.collection.insert_one(metrics.dict(by_alias=True))
        metrics.id = result.inserted_id
        return metrics
    
    async def update_metrics(
        self, 
        owner_id: ObjectId,
        co2_prevented: float = 0,
        food_saved: float = 0,
        money_saved: float = 0,
        meals_added: int = 0,
        items_rescued_added: int = 0
    ) -> UserMetrics:
        """Update user metrics by adding the specified amounts"""
        metrics = await self.get_or_create_metrics(owner_id)
        
        update_data = {
            "co2_emissions_prevented_kg": metrics.co2_emissions_prevented_kg + co2_prevented,
            "food_saved_lbs": metrics.food_saved_lbs + food_saved,
            "money_saved_usd": metrics.money_saved_usd + money_saved,
            "meals_created": metrics.meals_created + meals_added,
            "items_rescued": metrics.items_rescued + items_rescued_added,
            "last_activity": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await self.collection.update_one(
            {"owner_id": owner_id},
            {"$set": update_data}
        )
        
        updated_metrics = await self.get_or_create_metrics(owner_id)
        return updated_metrics

class RecipeRepository(BaseRepository):
    def __init__(self):
        super().__init__("recipes")
    
    async def create_recipe(self, recipe: RecipeDB) -> RecipeDB:
        result = await self.collection.insert_one(recipe.dict(by_alias=True))
        recipe.id = result.inserted_id
        return recipe
    
    async def find_by_owner(self, owner_id: ObjectId) -> List[RecipeDB]:
        cursor = self.collection.find({"owner_id": owner_id}).sort("created_at", -1)
        recipes = await cursor.to_list(length=None)
        return [RecipeDB(**recipe) for recipe in recipes]
    
    async def find_by_id(self, recipe_id: ObjectId) -> Optional[RecipeDB]:
        doc = await self.collection.find_one({"_id": recipe_id})
        return RecipeDB(**doc) if doc else None
    
    async def update_recipe(self, recipe_id: ObjectId, update_data: Dict[str, Any]) -> bool:
        update_data["updated_at"] = datetime.utcnow()
        result = await self.collection.update_one(
            {"_id": recipe_id},
            {"$set": update_data}
        )
        return result.modified_count > 0
    
    async def delete_recipe(self, recipe_id: ObjectId) -> bool:
        result = await self.collection.delete_one({"_id": recipe_id})
        return result.deleted_count > 0

# Repository instances
account_repo = AccountRepository()
posting_repo = PostingRepository()
claim_repo = ClaimRepository()
message_repo = MessageRepository()
scan_repo = ScanRepository()
inventory_repo = InventoryRepository()
user_metrics_repo = UserMetricsRepository()
recipe_repo = RecipeRepository()
