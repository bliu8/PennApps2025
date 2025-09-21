"""Notification service for generating food waste prevention nudges."""
import os
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from bson import ObjectId

from .database import get_database
from .models import InventoryItemDB
from .repositories import inventory_repo
from .gemini_service import gemini_processor


class NotificationService:
    def __init__(self):
        pass

    async def get_expiring_items(self, owner_id: ObjectId, days_ahead: int = 10) -> List[InventoryItemDB]:
        """Get inventory items expiring within the specified number of days."""
        from .database import get_database
        db = get_database()

        cutoff_date = datetime.utcnow() + timedelta(days=days_ahead)

        query = {
            "owner_id": owner_id,
            "status": "active",
            "est_expiry_date": {"$lte": cutoff_date}
        }

        cursor = db.inventory_items.find(query).sort("est_expiry_date", 1)
        docs = await cursor.to_list(length=None)
        return [InventoryItemDB(**doc) for doc in docs]

    def format_items_for_gemini(self, items: List[InventoryItemDB]) -> Dict[str, Any]:
        """Format inventory items for Gemini notification generation."""
        formatted_items = []
        for item in items:
            days_until_expiry = (item.est_expiry_date - datetime.utcnow()).days

            formatted_items.append({
                "id": str(item.id),
                "name": item.name,
                "quantity": item.remaining_quantity,
                "unit": item.base_unit,
                "days_until_expiry": max(0, days_until_expiry),
                "est_expiry_date": item.est_expiry_date.isoformat(),
                "cost_estimate": item.cost_estimate
            })

        return {
            "items": formatted_items,
            "total_items": len(formatted_items),
            "urgent_count": len([item for item in formatted_items if item["days_until_expiry"] <= 3])
        }

    def generate_notification_prompt(self, inventory_data: Dict[str, Any]) -> str:
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

    def generate_notification(self, inventory_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Generate notification content using Gemini."""
        try:
            prompt = self.generate_notification_prompt(inventory_data)

            # Use the existing Gemini service
            response = gemini_processor.model.generate_content(prompt)
            result_text = response.text.strip()

            # Clean up the response
            if result_text.startswith('```json'):
                result_text = result_text[7:]
            if result_text.endswith('```'):
                result_text = result_text[:-3]

            result_text = result_text.strip()

            # Parse the JSON response
            notification_data = json.loads(result_text)

            # Add metadata
            notification_data.update({
                "generated_at": datetime.utcnow().isoformat(),
                "inventory_summary": inventory_data
            })

            return notification_data

        except Exception as e:
            print(f"Error generating notification: {e}")
            return None


# Global instance
notification_service = NotificationService()
