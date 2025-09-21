#!/usr/bin/env python3
"""Get expiring inventory items for a specific user and format for recipe generation."""

import asyncio
import json
import os
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

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
            # If it's already an ObjectId or we can't convert, try as-is
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
                # Try to parse if it's a string
                try:
                    if isinstance(est_expiry, str):
                        est_dt = datetime.fromisoformat(est_expiry.replace('Z', '+00:00'))
                        days_until_expiry = (est_dt - now).days
                    else:
                        days_until_expiry = 0
                except:
                    days_until_expiry = 0

            # Categorize items (simple categorization based on name)
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


def format_for_recipe_instructions(items: List[Dict[str, Any]]) -> str:
    """Format items according to recipe_instructions.txt format."""
    if not items:
        return "No items found expiring within 10 days."

    output = []
    output.append(f"Found {len(items)} items expiring within 10 days:")
    output.append("")

    for item in items:
        output.append(f"Item: {item['name']}")
        output.append(f"  Quantity: {item['quantity']} {item['unit']}")
        output.append(f"  Expires in: {item['expires_in_days']} days")
        output.append(f"  Category: {item['category']}")
        output.append("")

    output.append("=" * 50)
    output.append("JSON FORMAT FOR GEMINI:")
    output.append("=" * 50)

    # Create the input format expected by recipe_instructions.txt
    gemini_input = {
        "items": items
    }

    output.append(json.dumps(gemini_input, indent=2))
    return "\n".join(output)


async def generate_recipe_suggestions(user_id: str, days_ahead: int = 10):
    """Get user data and generate recipe suggestions using Gemini."""
    print(f"🔍 Getting expiring items for user: {user_id}")

    # Get the user's expiring items
    items = await get_user_expiring_items(user_id, days_ahead)

    if not items:
        print("✅ No items expiring within 10 days for this user.")
        return

    print(f"📅 Found {len(items)} expiring items:")
    for item in items:
        urgency = "🚨" if item["expires_in_days"] <= 3 else "⚠️" if item["expires_in_days"] <= 7 else "📅"
        print(f"  {urgency} {item['name']} - {item['quantity']} {item['unit']} (expires in {item['expires_in_days']} days)")

    # Format for Gemini
    formatted_output = format_for_recipe_instructions(items)

    # Read the existing recipe_instructions.txt and append our data
    try:
        with open("recipe_instructions.txt", "r") as f:
            existing_content = f.read()
    except FileNotFoundError:
        existing_content = ""

    # Combine existing prompt with our formatted data
    if existing_content:
        combined_prompt = existing_content + "\n\n" + "="*50 + "\nUSER INVENTORY DATA:\n" + "="*50 + "\n\n" + formatted_output
    else:
        combined_prompt = formatted_output

    # Save to recipe_instructions.txt
    with open("recipe_instructions.txt", "w") as f:
        f.write(combined_prompt)

    print("\n💾 Updated recipe_instructions.txt with user data")
    # Now send to Gemini
    await call_gemini_api(items)


async def call_gemini_api(items: List[Dict[str, Any]]):
    """Call Gemini API with the user's expiring items."""
    import google.generativeai as genai

    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ GEMINI_API_KEY not found in environment")
        return

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')

    # Read the recipe instructions prompt
    try:
        with open("recipe_instructions.txt", "r") as f:
            prompt_template = f.read()
    except FileNotFoundError:
        print("❌ recipe_instructions.txt not found")
        return

    # Read the full recipe_instructions.txt file as the prompt
    try:
        with open("recipe_instructions.txt", "r") as f:
            prompt = f.read()
    except FileNotFoundError:
        # Fallback if file doesn't exist
        prompt = f"""
You are a sustainability-focused kitchen assistant.

I have the following items that are expiring soon. Please suggest what to do with them:

{json.dumps(items, indent=2)}

Please provide recipe suggestions following the sustainability guidelines.
"""

    print("🤖 Calling Gemini API...")

    try:
        response = model.generate_content(prompt)
        result = response.text

        print("\n" + "=" * 50)
        print("🧠 GEMINI RESPONSE:")
        print("=" * 50)
        print(result)
        print("=" * 50)

        # Save the response
        with open("gemini_recipe_response.txt", "w") as f:
            f.write(result)

        print("💾 Response saved to gemini_recipe_response.txt")

    except Exception as e:
        print(f"❌ Error calling Gemini API: {e}")


async def main():
    """Main function to get user data and generate recipes."""
    import sys

    # Get user_id from command line argument
    if len(sys.argv) > 1:
        user_id = sys.argv[1]
    else:
        print("Usage: python get_user_data.py <user_id>")
        print("Example: python get_user_data.py 507f1f77bcf86cd799439011")
        return

    await generate_recipe_suggestions(user_id, days_ahead=10)


if __name__ == "__main__":
    asyncio.run(main())
