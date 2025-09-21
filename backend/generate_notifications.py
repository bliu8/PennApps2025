#!/usr/bin/env python3
"""Generate notifications from recipe suggestions and store in MongoDB."""

import asyncio
import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

async def get_user_expiring_items(user_id: str, days_ahead: int = 10) -> List[Dict[str, Any]]:
    """Get inventory items expiring within the specified number of days for a specific user."""
    from app.database import connect_to_mongo, close_mongo_connection, get_database
    from bson import ObjectId

    await connect_to_mongo()
    try:
        db = get_database()

        # Convert string user_id to ObjectId if needed
        try:
            owner_id = ObjectId(user_id)
        except Exception:
            owner_id = user_id

        now = datetime.utcnow()
        cutoff = now + timedelta(days=days_ahead)

        coll = db["inventory_items"]
        cursor = coll.find({
            "owner_id": owner_id,
            "est_expiry_date": {"$lte": cutoff},
            "status": {"$in": ["active", "consumed", "expired", "discarded"]}
        })

        items = []
        async for doc in cursor:
            est_expiry = doc.get("est_expiry_date")
            if isinstance(est_expiry, datetime):
                days_until_expiry = (est_expiry - now).days
            else:
                try:
                    if isinstance(est_expiry, str):
                        est_dt = datetime.fromisoformat(est_expiry.replace('Z', '+00:00'))
                        days_until_expiry = (est_dt - now).days
                    else:
                        days_until_expiry = 0
                except:
                    days_until_expiry = 0

            # Categorize items
            name = doc.get("name", "").lower()
            if any(word in name for word in ["milk", "cheese", "yogurt", "cream"]):
                category = "dairy"
            elif any(word in name for word in ["chicken", "beef", "fish", "meat", "egg"]):
                category = "protein"
            elif any(word in name for word in ["apple", "banana", "berry", "fruit", "orange"]):
                category = "produce"
            elif any(word in name for word in ["rice", "pasta", "bread", "flour", "grain"]):
                category = "baked"
            elif any(word in name for word in ["soda", "juice", "water"]):
                category = "beverage"
            elif any(word in name for word in ["spinach", "lettuce", "kale", "greens"]):
                category = "produce"
            else:
                category = "other"

            item = {
                "_id": str(doc.get("_id")),
                "name": doc.get("name"),
                "quantity": doc.get("remaining_quantity", doc.get("quantity", 0)),
                "unit": doc.get("base_unit", "pieces"),
                "expires_in_days": max(0, days_until_expiry),
                "category": category,
                "owner_id": str(doc.get("owner_id"))
            }
            items.append(item)

        # Sort by expiration date (earliest first)
        items.sort(key=lambda x: x["expires_in_days"])
        return items

    finally:
        await close_mongo_connection()


async def generate_recipe_suggestions(user_id: str, days_ahead: int = 10):
    """Generate multiple diverse recipe suggestions using Gemini."""
    import google.generativeai as genai

    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ GEMINI_API_KEY not found in environment")
        return []

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')

    # Get the user's expiring items
    items = await get_user_expiring_items(user_id, days_ahead)

    if not items:
        print("✅ No items expiring within 10 days for this user.")
        return []

    print(f"📅 Found {len(items)} expiring items:")
    for item in items:
        urgency = "🚨" if item["expires_in_days"] <= 3 else "⚠️" if item["expires_in_days"] <= 7 else "📅"
        print(f"  {urgency} {item['name']} - {item['quantity']} {item['unit']} (expires in {item['expires_in_days']} days)")

    # Read the recipe instructions prompt
    try:
        with open("recipe_instructions.txt", "r") as f:
            prompt = f.read()
    except FileNotFoundError:
        prompt = "Generate recipe suggestions for the following items:"

    # Create the prompt with user data - ask for multiple diverse suggestions
    prompt_with_data = prompt + f"""

USER INVENTORY DATA:
{json.dumps(items, indent=2)}

IMPORTANT: Generate THREE DIFFERENT recipe suggestions that use different combinations of ingredients. Each suggestion should focus on different items from the inventory to ensure variety. Do not suggest the same dish or similar dishes multiple times."""

    print("🤖 Generating diverse recipe suggestions with Gemini...")

    try:
        response = model.generate_content(prompt_with_data)
        result = response.text

        print(f"📝 Recipe suggestions generated ({len(result)} characters)")

        # Parse the response to extract multiple action suggestions
        suggestions = []

        # Look for numbered suggestions (1), 2), 3))
        lines = result.strip().split('\n')
        current_suggestion = None

        for line in lines:
            line = line.strip()
            # Look for numbered suggestions
            if line.startswith("1)") or line.startswith("2)") or line.startswith("3)"):
                if current_suggestion:
                    suggestions.append(current_suggestion.strip())
                current_suggestion = line
            elif line and current_suggestion and not line.startswith("{") and not line.startswith("```"):
                # Continue building the current suggestion
                current_suggestion += " " + line

        if current_suggestion:
            suggestions.append(current_suggestion.strip())

        # Also look for standalone action lines
        for line in lines:
            line = line.strip()
            if (line and not line.startswith("1)") and not line.startswith("2)") and
                not line.startswith("3)") and not line.startswith("{") and
                not line.startswith("```") and not line.startswith("}") and
                any(word in line.lower() for word in ["make", "bake", "cook", "prepare", "use", "create", "whip up", "fix", "eat", "post to"])):
                # Only add if it's not already captured
                if not any(suggestion in line for suggestion in suggestions):
                    suggestions.append(line)

        # Clean up and ensure variety
        clean_suggestions = []
        used_dishes = set()

        for suggestion in suggestions:
            # Remove numbering and common prefixes
            suggestion = suggestion.replace("1)", "").replace("2)", "").replace("3)", "").replace("ACTION", "").strip()

            # Check for dish variety by looking for key ingredients
            suggestion_lower = suggestion.lower()
            dish_type = None

            if any(word in suggestion_lower for word in ["banana", "bread", "muffin"]):
                dish_type = "banana_bread"
            elif any(word in suggestion_lower for word in ["smoothie", "blend", "shake"]):
                dish_type = "smoothie"
            elif any(word in suggestion_lower for word in ["soup", "stew"]):
                dish_type = "soup"
            elif any(word in suggestion_lower for word in ["salad", "greens"]):
                dish_type = "salad"
            elif any(word in suggestion_lower for word in ["chicken", "meat", "protein"]):
                dish_type = "protein_dish"
            elif any(word in suggestion_lower for word in ["yogurt", "dairy"]):
                dish_type = "dairy_dish"
            elif "marketplace" in suggestion_lower or "post to" in suggestion_lower:
                dish_type = "marketplace"
            else:
                dish_type = "other"

            # Only add if it's not a duplicate dish type and meets length requirements
            if dish_type not in used_dishes and suggestion and len(suggestion) > 15:
                clean_suggestions.append(suggestion)
                used_dishes.add(dish_type)

        # If we don't have enough variety, create fallback suggestions based on available ingredients
        if len(clean_suggestions) < 3:
            available_items = [item['name'] for item in items if item['quantity'] > 0]
            fallback_suggestions = []

            # Create diverse suggestions based on available ingredients
            if any("yogurt" in item.lower() for item in available_items) and any("fruit" in item.lower() or "berry" in item.lower() for item in available_items):
                if "smoothie" not in used_dishes:
                    fallback_suggestions.append("Make a smoothie with the yogurt and berries.")

            if any("chicken" in item.lower() for item in available_items) and any("vegetable" in item.lower() or "spinach" in item.lower() for item in available_items):
                if "protein_dish" not in used_dishes:
                    fallback_suggestions.append("Cook chicken with vegetables.")

            if any("milk" in item.lower() for item in available_items) and any("cereal" in item.lower() or "oat" in item.lower() for item in available_items):
                if "dairy_dish" not in used_dishes:
                    fallback_suggestions.append("Use milk with cereal or oatmeal.")

            clean_suggestions.extend(fallback_suggestions[:3 - len(clean_suggestions)])

        return clean_suggestions[:3]  # Limit to 3 suggestions

    except Exception as e:
        print(f"❌ Error generating recipe suggestions: {e}")
        return []


async def generate_notifications_from_suggestions(suggestions: List[str], user_id: str):
    """Generate nudge notifications from recipe suggestions using Gemini."""
    import google.generativeai as genai

    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ GEMINI_API_KEY not found in environment")
        return []

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')

    # Read the notification instructions
    try:
        with open("notification_instructions.txt", "r") as f:
            notification_prompt = f.read()
    except FileNotFoundError:
        notification_prompt = "Convert the following recipe suggestions into short, positive notifications:"

    # Create the prompt
    suggestions_text = "\n".join(suggestions)
    prompt = f"{notification_prompt}\n\nInput lines:\n{suggestions_text}"

    print("🔔 Generating nudge notifications...")

    try:
        response = model.generate_content(prompt)
        result = response.text

        # Parse JSON response
        try:
            # Find JSON in the response
            if "```json" in result:
                start = result.find("```json") + 7
                end = result.find("```", start)
                json_str = result[start:end].strip()
            else:
                json_str = result.strip()

            notifications_data = json.loads(json_str)
            return notifications_data.get("notifications", [])

        except json.JSONDecodeError:
            print("❌ Could not parse JSON response from Gemini")
            print("Raw response:", result)
            return []

    except Exception as e:
        print(f"❌ Error generating notifications: {e}")
        return []


async def store_notifications_in_db(notifications: List[Dict[str, Any]], user_id: str):
    """Store notifications in MongoDB."""
    from app.database import connect_to_mongo, close_mongo_connection, get_database
    from bson import ObjectId

    await connect_to_mongo()
    try:
        db = get_database()

        # Convert user_id to ObjectId
        try:
            owner_id = ObjectId(user_id)
        except Exception:
            owner_id = user_id

        stored_count = 0

        for notification in notifications:
            notification_doc = {
                "owner_id": owner_id,
                "input": notification.get("input", ""),
                "notification": notification.get("notification", ""),
                "strategies_used": notification.get("strategies_used", []),
                "nudge_explanation": notification.get("nudge_explanation", ""),
                "created_at": datetime.utcnow(),
                "type": "recipe_nudge",
                "status": "pending"
            }

            result = await db.notifications.insert_one(notification_doc)
            stored_count += 1
            print(f"💾 Stored notification: {notification.get('notification', '')}")

        print(f"✅ Stored {stored_count} notifications in database")
        return stored_count

    finally:
        await close_mongo_connection()


async def check_existing_notifications(user_id: str) -> int:
    """Check how many notifications already exist for a user."""
    from app.database import connect_to_mongo, close_mongo_connection, get_database
    from bson import ObjectId

    await connect_to_mongo()
    try:
        db = get_database()

        try:
            owner_id = ObjectId(user_id)
        except Exception:
            owner_id = user_id

        count = await db.notifications.count_documents({"owner_id": owner_id})
        return count

    finally:
        await close_mongo_connection()


async def generate_and_store_notifications(user_id: str, max_notifications: int = 3):
    """Generate notifications and store them until we have the target count."""
    print(f"🔍 Checking existing notifications for user: {user_id}")

    # Check existing notifications
    existing_count = await check_existing_notifications(user_id)
    print(f"📊 User already has {existing_count} notifications")

    if existing_count >= max_notifications:
        print(f"✅ User already has {existing_count} notifications (target: {max_notifications})")
        return

    needed = max_notifications - existing_count
    print(f"🎯 Need to generate {needed} more notifications")

    # Generate recipe suggestions
    print("🍳 Step 1: Generating recipe suggestions...")
    suggestions = await generate_recipe_suggestions(user_id)

    if not suggestions:
        print("❌ No recipe suggestions generated")
        return

    print(f"📝 Generated {len(suggestions)} recipe suggestions:")
    for i, suggestion in enumerate(suggestions, 1):
        print(f"  {i}. {suggestion}")

    # Generate nudge notifications from suggestions
    print("🔔 Step 2: Converting to nudge notifications...")
    notifications = await generate_notifications_from_suggestions(suggestions, user_id)

    if not notifications:
        print("❌ No notifications generated")
        return

    print(f"💌 Generated {len(notifications)} nudge notifications:")
    for i, notification in enumerate(notifications, 1):
        print(f"  {i}. {notification.get('notification', '')}")

    # Store in database
    print("💾 Step 3: Storing in MongoDB...")
    stored_count = await store_notifications_in_db(notifications, user_id)

    # Verify final count
    final_count = await check_existing_notifications(user_id)
    print(f"✅ Complete! User now has {final_count} notifications in database")


async def main():
    """Main function to generate notifications for a user."""
    import sys

    # Get user_id from command line argument
    if len(sys.argv) > 1:
        user_id = sys.argv[1]
    else:
        print("Usage: python generate_notifications.py <user_id>")
        print("Example: python generate_notifications.py 68cedc8ac168b564227ca573")
        return

    await generate_and_store_notifications(user_id, max_notifications=3)


if __name__ == "__main__":
    asyncio.run(main())
