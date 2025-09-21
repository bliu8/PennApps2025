#!/usr/bin/env python3
import asyncio
from datetime import datetime
from app.database import connect_to_mongo, get_database

async def verify_both_databases():
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
    
    # Show urgent items
    urgent_count = 0
    print('\n⚠️  Urgent items (expiring in 3 days or less):')
    for item in inventory:
        # Calculate days until expiry
        expiry = datetime.fromisoformat(item['est_expiry_date'].replace('Z', '+00:00'))
        days_left = (expiry - datetime.utcnow()).days
        if days_left <= 3:
            urgent_count += 1
            print(f'   - {item["name"]} (expires in {days_left} days)')
    
    print(f'\nTotal urgent items: {urgent_count}')
    
    # Show sample items
    print('\n📋 Sample items:')
    for item in inventory[:5]:
        print(f'   - {item["name"]} ({item["quantity"]} {item["displayUnit"]})')

if __name__ == "__main__":
    asyncio.run(verify_both_databases())
