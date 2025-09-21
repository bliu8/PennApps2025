#!/usr/bin/env python3
"""
Terminal command to trigger food waste prevention notifications.
This script queries the database for items expiring within 10 days,
sends the data to Gemini to generate a notification, and displays it.
"""
import asyncio
import os
import sys
from datetime import datetime
from typing import Optional
from bson import ObjectId

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.database import connect_to_mongo, close_mongo_connection
from app.repositories import account_repo
from app.notification_service import notification_service


async def trigger_notification_for_user(email_or_auth0_id: Optional[str] = None):
    """Trigger a notification for a specific user or the first available user."""
    try:
        # Connect to database
        await connect_to_mongo()

        # Find user account
        if email_or_auth0_id:
            # Try to find by Auth0 ID first, then by email if needed
            account = await account_repo.find_by_auth0_id(email_or_auth0_id)
            if not account:
                print(f"No user found with Auth0 ID: {email_or_auth0_id}")
                return
        else:
            # Get first available account for demo purposes
            # In production, you'd get this from current user session
            cursor = account_repo.collection.find().limit(1)
            docs = await cursor.to_list(length=1)
            if not docs:
                print("No users found in database. Please add some inventory items first.")
                return
            account = await account_repo.find_by_id(docs[0]["_id"])

        print(f"🔍 Checking inventory for user: {account.name or account.auth0_id}")

        # Get expiring items (within 10 days)
        expiring_items = await notification_service.get_expiring_items(account.id, days_ahead=10)

        if not expiring_items:
            print("✅ No items expiring within 10 days. Your fridge is all good!")
            return

        print(f"📅 Found {len(expiring_items)} items expiring soon:")

        # Display items
        for item in expiring_items:
            days_left = (item.est_expiry_date - datetime.utcnow()).days
            urgency = "🚨" if days_left <= 3 else "⚠️" if days_left <= 7 else "📅"
            print(f"  {urgency} {item.name} - {item.remaining_quantity} {item.base_unit} (expires in {days_left} days)")

        # Format for Gemini
        inventory_data = notification_service.format_items_for_gemini(expiring_items)

        if inventory_data["urgent_count"] == 0:
            print("💡 No items require immediate attention.")
            return

        print("🤖 Generating notification with Gemini...")

        # Generate notification
        notification = notification_service.generate_notification(inventory_data)

        if notification:
            print("\n" + "="*50)
            print("🔔 NOTIFICATION GENERATED")
            print("="*50)
            print(f"📱 Title: {notification['title']}")
            print(f"💬 Body: {notification['body']}")
            print(f"⚡ Priority: {notification['priority']}")

            if 'suggested_actions' in notification:
                print("💡 Suggested actions:")
                for action in notification['suggested_actions']:
                    print(f"   • {action}")

            print(f"📊 Items processed: {inventory_data['total_items']} total, {inventory_data['urgent_count']} urgent")
            print("="*50)
        else:
            print("❌ Failed to generate notification")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await close_mongo_connection()


def main():
    """Main entry point for the notification command."""
    print("🍎 Leftys Food Waste Prevention Notification")
    print("="*45)

    # Get user identifier from command line or use default
    email_or_auth0_id = sys.argv[1] if len(sys.argv) > 1 else None

    if email_or_auth0_id:
        print(f"🎯 Targeting user: {email_or_auth0_id}")
    else:
        print("🎯 Using first available user (demo mode)")

    # Run the async function
    asyncio.run(trigger_notification_for_user(email_or_auth0_id))


if __name__ == "__main__":
    main()
