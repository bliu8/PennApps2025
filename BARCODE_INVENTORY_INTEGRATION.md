# Barcode Scanner to Inventory Integration

## Overview
Complete integration that connects barcode scanning to inventory management using Gemini AI for data processing.

## Architecture

```
Frontend (React Native/Expo)
    ↓ (barcode scan)
OpenFoodFacts API
    ↓ (product JSON)
Frontend API Service
    ↓ (POST /api/inventory/add-from-barcode)
Backend FastAPI
    ↓ (Gemini AI processing)
MongoDB Inventory
```

## Components

### 1. Backend Integration

#### New Files:
- `backend/app/gemini_service.py` - Gemini AI service for processing barcode data
- Updated `backend/app/main.py` - New inventory endpoint
- Updated `backend/requirements.txt` - Added google-generativeai

#### New Endpoint:
```http
POST /api/inventory/add-from-barcode
Content-Type: application/json
Authorization: Bearer <token>

{
  "barcode_data": {
    "name": "Product Name",
    "quantity": "1.3 oz, 37g",
    "brand": "Brand Name",
    "categories": ["en:breakfast-bar"],
    "allergens": ["en:gluten", "en:milk"]
  },
  "barcode": "0038000359217"
}
```

#### Response:
```json
{
  "success": true,
  "inventory_item": {
    "id": "item_id",
    "name": "Product Name",
    "quantity": 37,
    "baseUnit": "g",
    "est_expiry_date": "2025-09-28T00:00:00Z",
    "status": "active"
  }
}
```

### 2. Frontend Integration

#### Updated Files:
- `frontend/services/api.ts` - Added inventory integration functions
- `frontend/components/barcode-demo.tsx` - Added "Add to Inventory" functionality

#### New Functions:
- `addBarcodeToInventory(barcode, productInfo)` - Calls backend to add to inventory
- `AddToInventoryRequest` - TypeScript interface for request
- `AddToInventoryResponse` - TypeScript interface for response

### 3. Gemini AI Processing

The Gemini service processes barcode data and converts it to inventory format:

#### Input (from OpenFoodFacts):
```json
{
  "name": "Nutri Grain Strawberry",
  "quantity": "1.3 oz, 37g",
  "brand": "Kellogg's",
  "categories": ["en:breakfast-bar"],
  "allergens": ["en:gluten", "en:milk", "en:soybeans"]
}
```

#### Output (for MongoDB):
```json
{
  "name": "Nutri Grain Strawberry",
  "quantity": 37,
  "base_unit": "g",
  "display_unit": "bar",
  "est_expiry_date": "2025-09-28T00:00:00Z",
  "input_date": "2025-09-21T03:39:00Z",
  "remaining_quantity": 37,
  "status": "active"
}
```

## Features

### ✅ Implemented
- Barcode scanning (camera/file/URL)
- OpenFoodFacts API integration
- Gemini AI data processing
- MongoDB inventory storage
- Frontend UI with "Add to Inventory" button
- Error handling and loading states
- Authentication integration
- Quantity information extraction

### 🔄 Data Flow
1. **Scan**: User scans barcode with camera or uploads image
2. **Detect**: ZXing library detects barcode from image
3. **Query**: Frontend queries OpenFoodFacts API
4. **Display**: Product information shown to user
5. **Add**: User clicks "Add to Inventory" button
6. **Process**: Backend sends data to Gemini AI
7. **Convert**: Gemini converts to inventory format
8. **Store**: Data saved to MongoDB
9. **Confirm**: Success message shown to user

## Testing

### Test Scripts
- `test-barcode.js` - Tests barcode scanning and OpenFoodFacts integration
- `test-components.js` - Tests React component structure
- `test-barcode-inventory.js` - Tests complete integration flow

### Manual Testing
1. Start backend: `cd backend && uvicorn app.main:app --reload`
2. Start frontend: `cd frontend && npm start`
3. Open web version and navigate to barcode demo
4. Scan a barcode or use test image
5. Click "Add to Inventory" button
6. Verify success message and check MongoDB

## Environment Setup

### Backend (.env)
```env
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=mongodb://localhost:27017/leftys
```

### Frontend
```bash
npm install @zxing/library
```

## API Endpoints

### Existing
- `GET /api/inventory` - Get user's inventory
- `POST /api/inventory` - Add manual inventory item
- `POST /api/scan/barcode` - Scan barcode (OpenFoodFacts)

### New
- `POST /api/inventory/add-from-barcode` - Add barcode product to inventory

## Error Handling

- **Barcode not found**: Graceful fallback with error message
- **Gemini processing failed**: Error logged, user notified
- **Database error**: Transaction rolled back, error returned
- **Authentication error**: 401 response, user redirected to login
- **Network error**: Retry logic with exponential backoff

## Security

- JWT authentication required for inventory operations
- Input validation on all endpoints
- Rate limiting on external API calls
- CORS configured for frontend domain
- Environment variables for sensitive data

## Performance

- Async/await for all database operations
- Connection pooling for MongoDB
- Caching for frequently accessed data
- Lazy loading of barcode detection library
- Optimized image processing

## Future Enhancements

- Batch barcode processing
- Offline barcode scanning
- Barcode history and analytics
- Product recommendations
- Expiry date notifications
- Inventory sharing between users
