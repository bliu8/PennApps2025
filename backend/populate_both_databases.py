#!/usr/bin/env python3
"""
Populate Both Databases Script
Populates both main and demo databases with identical demo data
"""

import asyncio
from datetime import datetime, timedelta
from bson import ObjectId
from app.database import connect_to_mongo, get_database

# Demo user ID (the one with the granola bar)
DEMO_USER_ID = "68cfe262dd7c3446ae19ce42"

# Demo foods optimized for pitch/demo
DEMO_FOODS = [
    # Fresh produce (expiring soon - creates urgency)
    {
        "name": "Organic Spinach",
        "quantity": 150,
        "baseUnit": "g",
        "displayUnit": "g",
        "estCost": 3.99,
        "daysUntilExpiry": 2,  # Expires soon - shows alerts
    },
    {
        "name": "Ripe Bananas",
        "quantity": 4,
        "baseUnit": "pieces",
        "displayUnit": "pieces", 
        "estCost": 2.49,
        "daysUntilExpiry": 1,  # Expires tomorrow - urgent
    },
    {
        "name": "Fresh Avocados",
        "quantity": 2,
        "baseUnit": "pieces",
        "displayUnit": "pieces",
        "estCost": 4.99,
        "daysUntilExpiry": 3,  # Expires soon
    },
    {
        "name": "Cherry Tomatoes",
        "quantity": 200,
        "baseUnit": "g",
        "displayUnit": "g",
        "estCost": 3.49,
        "daysUntilExpiry": 4,  # Expires soon
    },
    
    # Dairy products (medium shelf life)
    {
        "name": "Greek Yogurt",
        "quantity": 500,
        "baseUnit": "ml",
        "displayUnit": "ml",
        "estCost": 4.99,
        "daysUntilExpiry": 7,  # Good for recipes
    },
    {
        "name": "Organic Milk",
        "quantity": 1,
        "baseUnit": "L",
        "displayUnit": "L",
        "estCost": 3.99,
        "daysUntilExpiry": 5,  # Good for recipes
    },
    {
        "name": "Cheddar Cheese",
        "quantity": 200,
        "baseUnit": "g",
        "displayUnit": "g",
        "estCost": 5.99,
        "daysUntilExpiry": 10,  # Longer shelf life
    },
    
    # Proteins (varied expiry)
    {
        "name": "Chicken Breast",
        "quantity": 600,
        "baseUnit": "g",
        "displayUnit": "g",
        "estCost": 8.99,
        "daysUntilExpiry": 1,  # Expires tomorrow - urgent
    },
    {
        "name": "Salmon Fillet",
        "quantity": 300,
        "baseUnit": "g",
        "displayUnit": "g",
        "estCost": 12.99,
        "daysUntilExpiry": 2,  # Expires soon
    },
    {
        "name": "Ground Turkey",
        "quantity": 500,
        "baseUnit": "g",
        "displayUnit": "g",
        "estCost": 6.99,
        "daysUntilExpiry": 3,  # Expires soon
    },
    
    # Grains & Pantry (longer shelf life)
    {
        "name": "Brown Rice",
        "quantity": 1,
        "baseUnit": "kg",
        "displayUnit": "kg",
        "estCost": 4.99,
        "daysUntilExpiry": 30,  # Long shelf life
    },
    {
        "name": "Quinoa",
        "quantity": 500,
        "baseUnit": "g",
        "displayUnit": "g",
        "estCost": 7.99,
        "daysUntilExpiry": 25,  # Long shelf life
    },
    {
        "name": "Whole Wheat Bread",
        "quantity": 1,
        "baseUnit": "loaf",
        "displayUnit": "loaf",
        "estCost": 3.49,
        "daysUntilExpiry": 5,  # Medium shelf life
    },
    
    # Snacks & Treats
    {
        "name": "Dark Chocolate",
        "quantity": 100,
        "baseUnit": "g",
        "displayUnit": "g",
        "estCost": 4.99,
        "daysUntilExpiry": 20,  # Long shelf life
    },
    {
        "name": "Almonds",
        "quantity": 200,
        "baseUnit": "g",
        "displayUnit": "g",
        "estCost": 6.99,
        "daysUntilExpiry": 15,  # Medium shelf life
    },
    {
        "name": "Kirkland Signature Soft & Chewy Granola Bar",
        "quantity": 23,
        "baseUnit": "g",
        "displayUnit": "g",
        "estCost": 0.99,
        "daysUntilExpiry": 90,  # Long shelf life - existing item
    },
    
    # Beverages
    {
        "name": "Coconut Water",
        "quantity": 1,
        "baseUnit": "L",
        "displayUnit": "L",
        "estCost": 3.99,
        "daysUntilExpiry": 14,  # Medium shelf life
    },
    {
        "name": "Green Tea",
        "quantity": 20,
        "baseUnit": "pieces",
        "displayUnit": "pieces",
        "estCost": 5.99,
        "daysUntilExpiry": 365,  # Very long shelf life
    },
    
    # More fresh produce for variety
    {
        "name": "Strawberries",
        "quantity": 250,
        "baseUnit": "g",
        "displayUnit": "g",
        "estCost": 4.99,
        "daysUntilExpiry": 3,  # Expires soon
    },
    {
        "name": "Bell Peppers",
        "quantity": 3,
        "baseUnit": "pieces",
        "displayUnit": "pieces",
        "estCost": 3.99,
        "daysUntilExpiry": 6,  # Medium shelf life
    },
    {
        "name": "Fresh Basil",
        "quantity": 30,
        "baseUnit": "g",
        "displayUnit": "g",
        "estCost": 2.99,
        "daysUntilExpiry": 4,  # Expires soon
    },
]

async def populate_database(db, db_name):
    """Populate a specific database with demo data"""
    print(f"\n🚀 Populating {db_name} database...")
    
    # Clear existing inventory for demo user
    result = await db.inventory_items.delete_many({"owner_id": DEMO_USER_ID})
    print(f"🗑️  Cleared {result.deleted_count} existing items for demo user")
    
    # Insert demo foods
    inventory_items = []
    total_value = 0
    
    for food in DEMO_FOODS:
        # Calculate expiry date
        expiry_date = datetime.utcnow() + timedelta(days=food["daysUntilExpiry"])
        
        item = {
            "_id": ObjectId(),
            "owner_id": DEMO_USER_ID,
            "name": food["name"],
            "quantity": food["quantity"],
            "remaining_quantity": food["quantity"],
            "baseUnit": food["baseUnit"],
            "displayUnit": food["displayUnit"],
            "input_date": datetime.utcnow().isoformat() + "Z",
            "est_expiry_date": expiry_date.isoformat() + "Z",
            "est_cost": food["estCost"],
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        inventory_items.append(item)
        total_value += food["estCost"]
    
    # Insert all items
    await db.inventory_items.insert_many(inventory_items)
    
    print(f"✅ Added {len(inventory_items)} demo food items")
    print(f"💰 Total estimated value: ${total_value:.2f}")
    
    # Create some demo recipes
    demo_recipes = [
        {
            "_id": ObjectId(),
            "owner_id": DEMO_USER_ID,
            "name": "Spinach & Avocado Smoothie",
            "description": "A nutritious green smoothie perfect for breakfast",
            "ingredients": ["Organic Spinach", "Ripe Bananas", "Greek Yogurt", "Coconut Water"],
            "instructions": [
                "Add spinach, banana, and yogurt to blender",
                "Pour in coconut water",
                "Blend until smooth",
                "Serve immediately"
            ],
            "image": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&h=300&fit=crop",
            "cooking_time_minutes": 5,
            "difficulty": "easy",
            "servings": 2,
            "tags": ["breakfast", "smoothie", "healthy"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "_id": ObjectId(),
            "owner_id": DEMO_USER_ID,
            "name": "Mediterranean Quinoa Bowl",
            "description": "A colorful and nutritious bowl with quinoa, vegetables, and herbs",
            "ingredients": ["Quinoa", "Cherry Tomatoes", "Bell Peppers", "Fresh Basil", "Cheddar Cheese"],
            "instructions": [
                "Cook quinoa according to package instructions",
                "Chop tomatoes and bell peppers",
                "Mix quinoa with vegetables",
                "Top with fresh basil and cheese",
                "Drizzle with olive oil"
            ],
            "image": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop",
            "cooking_time_minutes": 20,
            "difficulty": "medium",
            "servings": 4,
            "tags": ["lunch", "vegetarian", "healthy"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "_id": ObjectId(),
            "owner_id": DEMO_USER_ID,
            "name": "Grilled Salmon with Roasted Vegetables",
            "description": "A protein-rich dinner with perfectly cooked salmon and seasonal vegetables",
            "ingredients": ["Salmon Fillet", "Bell Peppers", "Cherry Tomatoes", "Fresh Basil"],
            "instructions": [
                "Preheat oven to 400°F",
                "Season salmon with herbs and spices",
                "Roast vegetables for 15 minutes",
                "Add salmon and cook for 12-15 minutes",
                "Serve with fresh basil garnish"
            ],
            "image": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop",
            "cooking_time_minutes": 30,
            "difficulty": "medium",
            "servings": 2,
            "tags": ["dinner", "protein", "healthy"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    # Clear existing recipes for demo user
    await db.recipes.delete_many({"owner_id": DEMO_USER_ID})
    
    # Insert demo recipes
    await db.recipes.insert_many(demo_recipes)
    print(f"🍳 Added {len(demo_recipes)} demo recipes")
    
    # Create some demo notifications
    demo_notifications = [
        {
            "_id": ObjectId(),
            "owner_id": DEMO_USER_ID,
            "type": "expiry_reminder",
            "title": "Bananas expiring tomorrow!",
            "body": "Your ripe bananas will expire tomorrow. Perfect for smoothies or banana bread!",
            "priority": "high",
            "read": False,
            "created_at": datetime.utcnow(),
            "data": {
                "item_name": "Ripe Bananas",
                "expiry_date": (datetime.utcnow() + timedelta(days=1)).isoformat() + "Z"
            }
        },
        {
            "_id": ObjectId(),
            "owner_id": DEMO_USER_ID,
            "type": "recipe_suggestion",
            "title": "New recipe available!",
            "body": "Try our Mediterranean Quinoa Bowl using your fresh vegetables",
            "priority": "medium",
            "read": False,
            "created_at": datetime.utcnow(),
            "data": {
                "recipe_name": "Mediterranean Quinoa Bowl"
            }
        }
    ]
    
    # Clear existing notifications for demo user
    await db.notifications.delete_many({"owner_id": DEMO_USER_ID})
    
    # Insert demo notifications
    await db.notifications.insert_many(demo_notifications)
    print(f"🔔 Added {len(demo_notifications)} demo notifications")
    
    # Update user metrics for demo
    user_metrics = {
        "owner_id": DEMO_USER_ID,
        "food_saved_lbs": 2.5,
        "carbon_prevented_kg": 1.2,
        "money_saved_usd": 15.99,
        "items_rescued": 8,
        "last_updated": datetime.utcnow()
    }
    
    await db.user_metrics.replace_one(
        {"owner_id": DEMO_USER_ID},
        user_metrics,
        upsert=True
    )
    print(f"📊 Updated user metrics for demo")
    
    # Show items by expiry urgency
    urgent_items = [food for food in DEMO_FOODS if food["daysUntilExpiry"] <= 3]
    print(f"\n⚠️  Urgent items (expiring in 3 days or less): {len(urgent_items)}")
    for food in urgent_items:
        print(f"   - {food['name']} (expires in {food['daysUntilExpiry']} days)")
    
    return len(inventory_items), len(demo_recipes), len(demo_notifications), total_value

async def populate_both_databases():
    """Populate both main and demo databases with identical data"""
    print("🚀 Starting population of both databases...")
    
    # Connect to main database
    await connect_to_mongo()
    main_db = get_database()
    
    # Populate main database
    main_items, main_recipes, main_notifications, main_value = await populate_database(main_db, "MAIN")
    
    print("\n" + "="*50)
    print("🎉 Both databases populated successfully!")
    print("="*50)
    print(f"👤 Demo user ID: {DEMO_USER_ID}")
    print(f"📦 Total items per database: {main_items}")
    print(f"🍳 Total recipes per database: {main_recipes}")
    print(f"🔔 Total notifications per database: {main_notifications}")
    print(f"💰 Total value per database: ${main_value:.2f}")
    print(f"⚠️  Urgent items per database: 7 (expiring in 3 days or less)")
    
    print("\n✅ Both databases now contain identical demo data!")
    print("🎯 Perfect for demo/pitch scenarios!")

if __name__ == "__main__":
    asyncio.run(populate_both_databases())
