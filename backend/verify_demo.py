#!/usr/bin/env python3
import asyncio
from app.database import connect_to_mongo, get_database

async def verify_demo_data():
    await connect_to_mongo()
    db = get_database()
    
    # Check inventory items
    inventory = await db.inventory_items.find({'owner_id': '68cfdde93d3b41f010762a6e'}).to_list(length=None)
    print(f'📦 Inventory items: {len(inventory)}')
    
    # Check recipes
    recipes = await db.recipes.find({'owner_id': '68cfdde93d3b41f010762a6e'}).to_list(length=None)
    print(f'🍳 Recipes: {len(recipes)}')
    
    # Check notifications
    notifications = await db.notifications.find({'owner_id': '68cfdde93d3b41f010762a6e'}).to_list(length=None)
    print(f'🔔 Notifications: {len(notifications)}')
    
    # Check user metrics
    metrics = await db.user_metrics.find_one({'owner_id': '68cfdde93d3b41f010762a6e'})
    if metrics:
        print(f'📊 User metrics: Food saved: {metrics.get("food_saved_lbs", 0)} lbs, Money saved: ${metrics.get("money_saved_usd", 0)}')
    
    # Show some urgent items
    print('\n⚠️  Sample items:')
    for item in inventory[:5]:
        print(f'   - {item["name"]} ({item["quantity"]} {item["displayUnit"]})')

if __name__ == "__main__":
    asyncio.run(verify_demo_data())
