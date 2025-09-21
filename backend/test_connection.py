#!/usr/bin/env python3
"""Test MongoDB Atlas connection and basic operations."""

import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_connection():
    """Test MongoDB Atlas connection"""
    try:
        from app.database import connect_to_mongo, close_mongo_connection, get_database
        
        print("🔗 Connecting to MongoDB Atlas...")
        await connect_to_mongo()
        
        db = get_database()
        if db:
            print("✅ Successfully connected to MongoDB Atlas!")
            
            # Test basic operations
            collections = await db.list_collection_names()
            print(f"📁 Available collections: {collections}")
            
            # Test a simple query
            postings_count = await db.postings.count_documents({})
            print(f"📊 Current postings count: {postings_count}")
            
        await close_mongo_connection()
        print("👋 Disconnected from MongoDB")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_connection())
