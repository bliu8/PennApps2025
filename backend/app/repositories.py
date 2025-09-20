"""Repository classes for MongoDB operations."""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection
import geohash
from math import radians, cos, sin, asin, sqrt

from .database import get_database
from .models import Account, PostingDB, Claim, Message, ScanRecordDB, GeoLocation

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

# Repository instances
account_repo = AccountRepository()
posting_repo = PostingRepository()
claim_repo = ClaimRepository()
message_repo = MessageRepository()
scan_repo = ScanRepository()
