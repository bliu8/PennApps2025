#!/usr/bin/env python3
import asyncio
from app.database import connect_to_mongo, get_database

async def clean_demo_data():
    await connect_to_mongo()
    db = get_database()
    
    # Get the main demo user ID
    demo_user_id = '68cfdde93d3b41f010762a6e'
    
    # Remove all items from other users
    result = await db.inventory_items.delete_many({'owner_id': {'$ne': demo_user_id}})
    print(f'Removed {result.deleted_count} items from other users')
    
    # Remove recipes from other users
    result = await db.recipes.delete_many({'owner_id': {'$ne': demo_user_id}})
    print(f'Removed {result.deleted_count} recipes from other users')
    
    # Remove notifications from other users
    result = await db.notifications.delete_many({'owner_id': {'$ne': demo_user_id}})
    print(f'Removed {result.deleted_count} notifications from other users')
    
    # Remove user metrics from other users
    result = await db.user_metrics.delete_many({'owner_id': {'$ne': demo_user_id}})
    print(f'Removed {result.deleted_count} user metrics from other users')
    
    # Verify final state
    inventory = await db.inventory_items.find({'owner_id': demo_user_id}).to_list(length=None)
    recipes = await db.recipes.find({'owner_id': demo_user_id}).to_list(length=None)
    notifications = await db.notifications.find({'owner_id': demo_user_id}).to_list(length=None)
    
    print(f'\nFinal state for demo user {demo_user_id}:')
    print(f'  - Inventory items: {len(inventory)}')
    print(f'  - Recipes: {len(recipes)}')
    print(f'  - Notifications: {len(notifications)}')
    
    # Show sample items
    print('\nSample items:')
    for item in inventory[:5]:
        print(f'  - {item["name"]} ({item["quantity"]} {item["displayUnit"]})')

if __name__ == "__main__":
    asyncio.run(clean_demo_data())
