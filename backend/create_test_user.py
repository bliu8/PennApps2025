#!/usr/bin/env python3
"""Create a test user with diverse ingredients for testing notifications."""

import asyncio
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from app.database import connect_to_mongo, close_mongo_connection, get_database
from bson import ObjectId

load_dotenv()

async def create_test_user():
    """Create a test user with diverse ingredients."""
    await connect_to_mongo()
    try:
        db = get_database()

        # Create a new test user account
        test_account = {
            "auth0_id": "test-user-diverse-ingredients",
            "name": "Test User - Diverse Ingredients",
            "phone": "555-0123",
            "phone_verified": False,
            "expo_push_tokens": [],
            "created_at": datetime.utcnow(),
            "strikes": 0,
            "banned": False
        }

        account_result = await db.accounts.insert_one(test_account)
        test_user_id = account_result.inserted_id
        print(f"✅ Created test user account: {test_user_id}")

        # Create diverse ingredients that will expire soon
        now = datetime.utcnow()

        test_ingredients = [
            # Dairy products
            {
                "owner_id": test_user_id,
                "name": "Greek Yogurt",
                "quantity": 2.0,
                "base_unit": "pieces",
                "input_date": now - timedelta(days=3),
                "est_expiry_date": now + timedelta(days=2),
                "status": "active"
            },
            {
                "owner_id": test_user_id,
                "name": "Whole Milk",
                "quantity": 1.0,
                "base_unit": "L",
                "input_date": now - timedelta(days=2),
                "est_expiry_date": now + timedelta(days=4),
                "status": "active"
            },
            {
                "owner_id": test_user_id,
                "name": "Cheddar Cheese",
                "quantity": 1.0,
                "base_unit": "pieces",
                "input_date": now - timedelta(days=1),
                "est_expiry_date": now + timedelta(days=7),
                "status": "active"
            },

            # Proteins
            {
                "owner_id": test_user_id,
                "name": "Chicken Breast",
                "quantity": 3.0,
                "base_unit": "pieces",
                "input_date": now - timedelta(days=2),
                "est_expiry_date": now + timedelta(days=1),
                "status": "active"
            },
            {
                "owner_id": test_user_id,
                "name": "Ground Turkey",
                "quantity": 1.5,
                "base_unit": "lb",
                "input_date": now - timedelta(days=1),
                "est_expiry_date": now + timedelta(days=3),
                "status": "active"
            },

            # Vegetables
            {
                "owner_id": test_user_id,
                "name": "Fresh Spinach",
                "quantity": 1.0,
                "base_unit": "pieces",
                "input_date": now - timedelta(days=3),
                "est_expiry_date": now + timedelta(days=0),
                "status": "active"
            },
            {
                "owner_id": test_user_id,
                "name": "Cherry Tomatoes",
                "quantity": 2.0,
                "base_unit": "pieces",
                "input_date": now - timedelta(days=2),
                "est_expiry_date": now + timedelta(days=2),
                "status": "active"
            },
            {
                "owner_id": test_user_id,
                "name": "Bell Peppers",
                "quantity": 4.0,
                "base_unit": "pieces",
                "input_date": now - timedelta(days=1),
                "est_expiry_date": now + timedelta(days=5),
                "status": "active"
            },
            {
                "owner_id": test_user_id,
                "name": "Zucchini",
                "quantity": 3.0,
                "base_unit": "pieces",
                "input_date": now - timedelta(days=2),
                "est_expiry_date": now + timedelta(days=4),
                "status": "active"
            },

            # Fruits
            {
                "owner_id": test_user_id,
                "name": "Blueberries",
                "quantity": 1.0,
                "base_unit": "pieces",
                "input_date": now - timedelta(days=2),
                "est_expiry_date": now + timedelta(days=1),
                "status": "active"
            },
            {
                "owner_id": test_user_id,
                "name": "Strawberries",
                "quantity": 1.0,
                "base_unit": "pieces",
                "input_date": now - timedelta(days=1),
                "est_expiry_date": now + timedelta(days=2),
                "status": "active"
            },
            {
                "owner_id": test_user_id,
                "name": "Apples",
                "quantity": 6.0,
                "base_unit": "pieces",
                "input_date": now - timedelta(days=3),
                "est_expiry_date": now + timedelta(days=8),
                "status": "active"
            },

            # Grains
            {
                "owner_id": test_user_id,
                "name": "Brown Rice",
                "quantity": 2.0,
                "base_unit": "pieces",
                "input_date": now - timedelta(days=5),
                "est_expiry_date": now + timedelta(days=15),
                "status": "active"
            },
            {
                "owner_id": test_user_id,
                "name": "Quinoa",
                "quantity": 1.0,
                "base_unit": "pieces",
                "input_date": now - timedelta(days=3),
                "est_expiry_date": now + timedelta(days=20),
                "status": "active"
            }
        ]

        # Insert all ingredients
        ingredient_results = await db.inventory_items.insert_many(test_ingredients)
        print(f"✅ Created {len(ingredient_results.inserted_ids)} test ingredients")

        # Show summary
        print("📊 Test User Inventory Summary:")
        print(f"   User ID: {test_user_id}")
        print(f"   Account ID: {account_result.inserted_id}")
        print("   Ingredients by category:")
        categories = {}
        for item in test_ingredients:
            cat = item["name"].split()[-1] if "yogurt" in item["name"].lower() or "cheese" in item["name"].lower() else "other"
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(item["name"])

        for cat, items in categories.items():
            print(f"   - {cat}: {len(items)} items")

        return str(test_user_id)

    finally:
        await close_mongo_connection()


async def main():
    """Main function to create test user."""
    test_user_id = await create_test_user()
    print(f"🎉 Test user created successfully!")
    print(f"💡 Use this user ID for testing: {test_user_id}")


if __name__ == "__main__":
    asyncio.run(main())
