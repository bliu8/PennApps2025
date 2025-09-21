# MongoDB Atlas Integration - Setup Complete! 🎉

Your Leftys application now has **full MongoDB Atlas integration** with advanced geospatial capabilities perfect for winning the "Best use of MongoDB Atlas" prize!

## 🚀 What's Been Implemented

### ✅ Database Architecture
- **Full async MongoDB integration** using Motor (AsyncIOMotorClient)
- **Geospatial indexing** with 2dsphere for location-based food discovery
- **TTL (Time-To-Live) indexes** for automatic posting expiry
- **Compound indexes** for optimized queries

### ✅ Collections & Models
- **`accounts`** - User authentication and profile data
- **`postings`** - Food listings with geospatial coordinates
- **`claims`** - Request/acceptance system for food items
- **`messages`** - Per-posting chat functionality
- **`scans`** - AI-powered food label scanning history

### ✅ Advanced Features
- **Nearby search** - Find food within customizable radius (default 2km)
- **Automatic expiry** - TTL indexes clean up expired postings
- **Business rules** - Max 3 open postings per user, 1 active claim per user
- **Privacy protection** - Exact coordinates only shown to owners/accepted claimers
- **Sample data seeding** - Demo-ready with University of Pennsylvania locations

## 🔧 Setup Instructions

### 1. Environment Configuration
Create `/backend/.env` with your MongoDB Atlas connection:

```env
# MongoDB Configuration (REQUIRED)
MONGODB_URI=mongodb+srv://leftys-app:<your-password>@leftys-cluster.tcdbrxd.mongodb.net/?retryWrites=true&w=majority&appName=leftys-cluster
MONGODB_DB_NAME=leftys

# Development Settings
SEED_DATABASE=true

# Auth0 Settings (optional for demo)
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_AUDIENCE=your-api-audience
```

**Important:** Replace `<your-password>` with your actual MongoDB Atlas database user password!

### 2. Install Dependencies
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Test Connection
```bash
cd backend
python test_connection.py
```

Expected output:
```
🔗 Connecting to MongoDB Atlas...
✅ Successfully connected to MongoDB Atlas!
📁 Available collections: ['accounts', 'postings', 'claims', 'messages', 'scans']
📊 Current postings count: 5
👋 Disconnected from MongoDB
```

### 4. Start the Server
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 🏆 Prize-Worthy Features

### Geospatial Queries
```python
# Find food within 2km of user location
postings = await posting_repo.find_nearby(
    lat=39.9526, lng=-75.1652, radius_km=2.0
)
```

### Advanced Indexing Strategy
```javascript
// Automatically created indexes
db.postings.createIndex({ "location": "2dsphere" })           // Geospatial
db.postings.createIndex({ "status": 1, "expires_at": 1 })     // Query optimization
db.postings.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 }) // TTL
```

### Real-Time State Management
- **Automatic expiry** via TTL indexes
- **Claim timeout handling** (45-minute windows)
- **Status transitions** (open → reserved → picked_up)

## 📊 Demo Data

With `SEED_DATABASE=true`, the app creates:
- **5 sample user accounts** with verified phone numbers
- **5 food postings** around UPenn campus
- **Realistic pickup windows** staggered over time
- **Diverse allergen examples** (gluten, dairy, nuts, etc.)

## 🗺️ API Endpoints

### Enhanced Endpoints with MongoDB:
- `GET /api/postings?lat=39.95&lng=-75.16&radius_km=2` - Geospatial nearby search
- `POST /api/postings` - Create posting with location validation
- `GET /api/scans` - User's scan history from database
- `POST /api/scans` - Save scan to database

### Location Privacy
- **Approximate coordinates** shown to all users (geohash5 blurred)
- **Exact coordinates** only revealed to owner and accepted claimer
- **Pickup hints** encourage public meeting spots

## 🔍 Monitoring & Performance

### Built-in Observability
- **Connection pooling** with Motor for optimal performance
- **Structured error handling** with meaningful HTTP status codes
- **Index performance** optimized for read-heavy workloads
- **Automatic cleanup** via TTL indexes

## 🎯 Hackathon Demo Script

1. **Show geospatial search**: Query nearby food postings on map
2. **Demonstrate real-time updates**: Create posting, show immediate availability
3. **Privacy features**: Show blurred vs. exact coordinates
4. **Scalability**: Mention indexes, TTL, and Atlas auto-scaling
5. **Business logic**: Max postings, claim timeouts, state transitions

## 📈 Production Readiness

- **Async/await** throughout for high concurrency
- **Connection pooling** for database efficiency  
- **Error handling** with proper HTTP status codes
- **Environment-based configuration**
- **Structured logging** for observability

## 🐛 Troubleshooting

### Common Issues
1. **Import errors**: Ensure virtual environment is activated
2. **Connection timeout**: Check IP whitelist in MongoDB Atlas
3. **Authentication errors**: Verify AUTH0_DOMAIN and AUTH0_AUDIENCE
4. **Seeding errors**: Check SEED_DATABASE=true in .env

### Debug Mode
Set environment variable for verbose logging:
```bash
export PYTHONPATH=/Users/benliu/Downloads/PennApps2025-main\ 3/backend
```

## 🏁 Ready for Judging!

Your application now showcases:
- ✅ **Advanced MongoDB Atlas usage** (geospatial, TTL, complex queries)
- ✅ **Production-ready architecture** (async, pooling, error handling)  
- ✅ **Real-world problem solving** (food waste reduction)
- ✅ **Modern tech stack** (FastAPI, Motor, Pydantic)
- ✅ **Demo-ready data** (UPenn campus locations)

**Good luck with the "Best use of MongoDB Atlas" prize!** 🏆
