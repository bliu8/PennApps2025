# 🍎 Leftys Notification System

This notification system helps prevent food waste by alerting users about items that are expiring soon.

## Features

- **Terminal Command**: Run notifications from your terminal
- **API Endpoints**: Trigger notifications via REST API
- **Gemini Integration**: AI-generated notification content
- **Smart Filtering**: Only shows items expiring within 10 days
- **Priority System**: Urgency-based notification priorities

## Quick Start

### 1. Terminal Command

From the backend directory, run:

```bash
# Basic notification (uses first available user)
python notify.py

# Target specific user by Auth0 ID
python notify.py user123

# Make executable and run directly
./notify.py
```

### 2. API Endpoints

#### Generate Notification
```bash
curl -X POST "http://localhost:8000/api/notifications/generate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Preview Notifications
```bash
curl -X GET "http://localhost:8000/api/notifications/preview" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Response Format

### Terminal Output
```
🍎 Leftys Food Waste Prevention Notification
=============================================
🔍 Checking inventory for user: john@example.com
📅 Found 3 items expiring soon:
  🚨 Milk - 2.0 L (expires in 2 days)
  ⚠️  Cheese - 200 g (expires in 5 days)
  📅 Yogurt - 4 pieces (expires in 8 days)
🤖 Generating notification with Gemini...

==================================================
🔔 NOTIFICATION GENERATED
==================================================
📱 Title: Don't let your milk go to waste!
💬 Body: Your milk expires in 2 days. Use it in coffee, smoothies, or make pancakes today!
⚡ Priority: high
💡 Suggested actions:
   • Use milk in your morning coffee
   • Make a smoothie with yogurt
   • Plan meals around expiring dairy
📊 Items processed: 3 total, 1 urgent
==================================================
```

### API Response
```json
{
  "success": true,
  "notification": {
    "title": "Don't let your milk go to waste!",
    "body": "Your milk expires in 2 days. Use it in coffee, smoothies, or make pancakes today!",
    "priority": "high",
    "suggested_actions": [
      "Use milk in your morning coffee",
      "Make a smoothie with yogurt"
    ],
    "generated_at": "2025-01-20T10:30:00Z",
    "inventory_summary": {
      "items": [...],
      "total_items": 3,
      "urgent_count": 1
    }
  },
  "message": "Notification generated successfully",
  "items_found": 3,
  "urgent_count": 1
}
```

## How It Works

1. **Query Database**: Finds items expiring within 10 days
2. **Filter Urgent Items**: Prioritizes items expiring in 3 days or less
3. **Format for AI**: Structures data for Gemini processing
4. **Generate Content**: Uses AI to create personalized notifications
5. **Display Results**: Shows notification in terminal or returns via API

## Configuration

Make sure these environment variables are set:
- `MONGODB_URI` - Your MongoDB connection string
- `GEMINI_API_KEY` or `GOOGLE_API_KEY` - Your Gemini API key

## Demo Usage

For hackathon demos, you can:

1. Add some test inventory items with expiry dates
2. Run the terminal command to see live notifications
3. Use the API endpoints for mobile app integration
4. Customize the notification prompts in `notification_service.py`

## Integration with Existing System

This system integrates with your existing:
- ✅ MongoDB database and inventory items
- ✅ Authentication system (Auth0)
- ✅ Gemini AI service
- ✅ Repository patterns

The notification system respects your existing data models and follows the same patterns as other services in the codebase.
