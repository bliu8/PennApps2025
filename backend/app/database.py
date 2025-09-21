"""MongoDB Atlas connection and configuration."""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
import logging
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

class Database:
    client: Optional[AsyncIOMotorClient] = None
    database = None

db = Database()

async def connect_to_mongo():
    """Create database connection"""
    mongodb_uri = os.getenv("MONGODB_URI")
    mongodb_db_name = os.getenv("MONGODB_DB_NAME", "Leftys")
    
    if not mongodb_uri:
        raise ValueError("MONGODB_URI environment variable is required")
    
    try:
        db.client = AsyncIOMotorClient(mongodb_uri)
        
        # Test the connection
        await db.client.admin.command('ping')
        logger.info("Successfully connected to MongoDB Atlas")
        
        db.database = db.client[mongodb_db_name]
        
        # Create indexes
        await create_indexes()
        
    except ConnectionFailure as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    """Close database connection"""
    if db.client:
        db.client.close()
        logger.info("Disconnected from MongoDB")

async def create_indexes():
    """Create required indexes for optimal performance"""
    if db.database is None:
        return
    
    try:
        # Postings collection indexes
        postings = db.database.postings
        
        # Geospatial index for location-based queries
        await postings.create_index([("location", "2dsphere")])
        
        # Compound indexes for efficient queries
        await postings.create_index([("status", 1), ("expires_at", 1)])
        await postings.create_index([("owner_id", 1), ("status", 1)])
        
        # TTL index for automatic expiry
        await postings.create_index([("expires_at", 1)], expireAfterSeconds=0)
        
        # Accounts collection indexes
        accounts = db.database.accounts
        await accounts.create_index([("phone", 1)], unique=True)
        await accounts.create_index([("auth0_id", 1)], unique=True)
        
        # Claims collection indexes
        claims = db.database.claims
        await claims.create_index([("posting_id", 1)])
        await claims.create_index([("claimer_id", 1), ("status", 1)])
        
        # Messages collection index
        messages = db.database.messages
        await messages.create_index([("posting_id", 1), ("created_at", 1)])
        
        logger.info("Database indexes created successfully")
    except Exception as e:
        # Index creation might fail if they already exist or due to permissions
        logger.warning(f"Index creation warning: {e}")
        logger.info("Continuing with existing indexes")

def get_database():
    """Get database instance"""
    if db.database is None:
        raise RuntimeError("Database connection not established. Make sure to call connect_to_mongo() first.")
    return db.database
