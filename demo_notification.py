#!/usr/bin/env python3
"""
Demo script showing how to use the notification system.
This script demonstrates the notification flow without requiring a full database setup.
"""
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Mock inventory data for demonstration
MOCK_EXPIRING_ITEMS = [
    {
        "id": "item1",
        "name": "Milk",
        "quantity": 2.0,
        "unit": "L",
        "days_until_expiry": 2,
        "est_expiry_date": (datetime.utcnow() + timedelta(days=2)).isoformat(),
        "cost_estimate": 3.99
    },
    {
        "id": "item2",
        "name": "Greek Yogurt",
        "quantity": 4.0,
        "unit": "pieces",
        "days_until_expiry": 5,
        "est_expiry_date": (datetime.utcnow() + timedelta(days=5)).isoformat(),
        "cost_estimate": 5.99
    },
    {
        "id": "item3",
        "name": "Spinach",
        "quantity": 200.0,
        "unit": "g",
        "days_until_expiry": 8,
        "est_expiry_date": (datetime.utcnow() + timedelta(days=8)).isoformat(),
        "cost_estimate": 2.49
    }
]

def format_items_for_gemini(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Format inventory items for Gemini notification generation."""
    return {
        "items": items,
        "total_items": len(items),
        "urgent_count": len([item for item in items if item["days_until_expiry"] <= 3])
    }

def generate_notification_prompt(inventory_data: Dict[str, Any]) -> str:
    """Generate a prompt for Gemini to create notification content."""
    items_text = json.dumps(inventory_data["items"], indent=2)

    return f"""
You are a helpful food waste prevention assistant. You need to generate a friendly, actionable notification message to help users use their food before it expires.

Current inventory data:
{items_text}

Today's date: {datetime.utcnow().strftime('%Y-%m-%d')}

Please generate a notification message with:
1. A friendly, urgent but not alarming title
2. A helpful body suggesting how to use the items
3. Focus on items expiring soon (3 days or less)
4. Suggest simple meal ideas or usage tips
5. Encourage immediate action but keep it positive
6. Keep it concise (under 200 characters for the body)

Return only a JSON object with this structure:
{{
    "title": "Catchy, actionable title",
    "body": "Helpful message with specific suggestions",
    "priority": "high|medium|low" (based on urgency),
    "suggested_actions": ["Use milk in coffee", "Make smoothie with yogurt"]
}}

If no urgent items, return a general encouragement message.
"""

def demo_notification_system():
    """Demonstrate the notification system with mock data."""
    print("🍎 Leftys Food Waste Prevention Notification - DEMO")
    print("="*55)

    # Format items for Gemini
    inventory_data = format_items_for_gemini(MOCK_EXPIRING_ITEMS)

    print(f"📅 Processing {inventory_data['total_items']} items expiring soon:")
    for item in MOCK_EXPIRING_ITEMS:
        urgency = "🚨" if item["days_until_expiry"] <= 3 else "⚠️" if item["days_until_expiry"] <= 7 else "📅"
        print(f"  {urgency} {item['name']} - {item['quantity']} {item['unit']} (expires in {item['days_until_expiry']} days)")

    print(f"\n📊 Summary: {inventory_data['urgent_count']} urgent items requiring attention")

    # Generate the prompt
    prompt = generate_notification_prompt(inventory_data)

    print("\n🤖 Gemini Prompt Generated:")
    print("-" * 30)
    print(prompt)
    print("-" * 30)

    print("\n💡 Next Steps:")
    print("1. Copy this prompt to Gemini AI Studio or API")
    print("2. Get the AI-generated notification content")
    print("3. Use the real notification service with actual database data")
    print("\n🔗 Real Usage:")
    print("   cd backend && python notify.py")
    print("   OR")
    print("   curl -X POST 'http://localhost:8000/api/notifications/generate' -H 'Authorization: Bearer YOUR_TOKEN'")

if __name__ == "__main__":
    demo_notification_system()
