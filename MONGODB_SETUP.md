# MongoDB Integration Setup Guide

## 🚀 How the Tracking System Works

### **For Field Employees (Users):**

1. **Daily Workflow:**
   - Open tracking app → Grant location permission
   - System auto-tracks location in background
   - Click "Start Meeting" → Select company & lead → Add details
   - During meeting: Status shows "In Meeting", location tracked
   - Click "End Meeting" → Fill details & select attendees → Save

2. **Meeting Process:**
   - **Start**: Captures location, time, company, lead ID, notes
   - **End**: Records attendees, discussion, completion time
   - **Data**: Automatically saves to MongoDB with full details

### **For Administrators:**

1. **Dashboard Access:** Navigate to `/dashboard`

2. **Overview Features:**
   - Real-time employee status
   - Meeting analytics and summaries
   - Attendance management

3. **Detailed Analysis:**
   - Click "View Details" on any employee
   - **Daily Summary**: Duty hours, attendance status/reason, meeting times
   - **Meeting Details**: Complete meeting history with all attendees
   - **History**: Full timeline of employee interactions

---

## 🗄️ MongoDB Database Setup

### **1. Install MongoDB Locally**

#### **Option A: MongoDB Community Server**
```bash
# macOS (using Homebrew)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community

# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod

# Windows
# Download and install from: https://www.mongodb.com/try/download/community
```

#### **Option B: MongoDB Docker**
```bash
# Run MongoDB in Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# With persistent data
docker run -d -p 27017:27017 --name mongodb -v mongodb_data:/data/db mongo:latest
```

### **2. Configure Database Connection**

#### **Update Environment Variables:**

1. **Copy the example file:**
```bash
cp .env.example .env
```

2. **Edit `.env` file:**
```env
# Update these URLs with your MongoDB setup

# For local MongoDB (default)
MONGODB_URI=mongodb://localhost:27017/employee-tracking
DB_NAME=employee-tracking

# For MongoDB with authentication
MONGODB_URI=mongodb://username:password@localhost:27017/employee-tracking

# For MongoDB Atlas (cloud)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/employee-tracking

# For custom host/port
MONGODB_URI=mongodb://your-host:your-port/employee-tracking
```

### **3. Database Collections**

The system automatically creates these collections:

#### **meetings**
- Stores all meeting data (start/end times, locations, attendees, discussions)
- Indexes: employeeId, startTime, leadId, status

#### **meeting_history** 
- Historical meeting records for analytics
- Indexes: employeeId, timestamp, leadId, sessionId

#### **attendance**
- Daily attendance records (full_day, half_day, off, short_leave, ot)
- Indexes: employeeId, date (unique compound index)

### **4. Start the Application**

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### **5. Verify Database Connection**

#### **Automated Verification Script (Recommended):**
```bash
# Run the comprehensive MongoDB test script
node scripts/test-mongodb.js
```

This script will test:
- ✅ MongoDB connection
- ✅ Database operations (CRUD)
- ✅ Collection access and creation
- ✅ Index verification
- ✅ Data persistence

#### **Expected Output:**
```
🧪 MongoDB Setup Verification
============================
📦 MongoDB URI: mongodb://localhost:27017/employee-tracking
📂 Database Name: employee-tracking

🔌 Testing MongoDB connection...
✅ MongoDB connection successful

📋 Testing collections...
Found 5 collections:
  - meetings
  - meeting_history
  - attendance
  - tracking_sessions
  - employees

💾 Testing data operations...
  ✅ INSERT operation successful
  ✅ READ operation successful
  ✅ UPDATE operation successful
  ✅ DELETE operation successful

🎉 All tests passed! MongoDB setup is working correctly.
```

#### **Manual Verification:**

1. **Check Server Logs:**
   Look for these messages:
   ```
   📦 Database: Connecting to MongoDB...
   ✅ Database: Successfully connected to MongoDB
   ```

2. **Test Functionality:**
   - Create a meeting → Check `meetings` collection
   - End a meeting → Check `meeting_history` collection
   - Set attendance → Check `attendance` collection

3. **Direct Database Check:**
   ```bash
   # Connect to MongoDB shell
   mongosh mongodb://localhost:27017/employee-tracking

   # Check collections
   show collections

   # Verify data exists
   db.meetings.find().limit(2)
   db.attendance.find().limit(2)
   ```

### **6. Database Fallback System**

The system includes automatic fallback:
- **Primary**: Uses MongoDB for all operations
- **Fallback**: Uses in-memory storage if MongoDB fails
- **Seamless**: Application continues working regardless

---

## 📊 Database Schema

### **Meeting Document Example:**
```json
{
  "_id": "ObjectId",
  "employeeId": "67daa55d9c4abb36045d5bfe",
  "location": {
    "lat": 28.6139,
    "lng": 77.2090,
    "address": "New Delhi, India",
    "timestamp": "2024-01-15T09:30:00.000Z"
  },
  "startTime": "2024-01-15T09:30:00.000Z",
  "endTime": "2024-01-15T11:00:00.000Z",
  "clientName": "Tech Corp",
  "status": "completed",
  "leadId": "JBDSL-0044",
  "leadInfo": {
    "id": "JBDSL-0044",
    "companyName": "Tech Corp",
    "contactName": "John Doe"
  },
  "meetingDetails": {
    "customers": [
      {
        "customerName": "Tech Corp",
        "customerEmployeeName": "John Doe",
        "customerEmail": "john@techcorp.com",
        "customerMobile": "9876543210",
        "customerDesignation": "Manager",
        "customerDepartment": "IT"
      }
    ],
    "discussion": "Discussed new project requirements..."
  },
  "createdAt": "2024-01-15T09:30:00.000Z",
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

### **Attendance Document Example:**
```json
{
  "_id": "ObjectId",
  "employeeId": "67daa55d9c4abb36045d5bfe",
  "date": "2024-01-15",
  "attendanceStatus": "full_day",
  "attendanceReason": "",
  "createdAt": "2024-01-15T09:00:00.000Z",
  "updatedAt": "2024-01-15T09:00:00.000Z"
}
```

---

## 🔧 Troubleshooting

### **Common Issues:**

1. **Connection Failed:**
   - Check if MongoDB is running: `brew services list | grep mongodb`
   - Verify connection string in `.env`
   - Check firewall settings

2. **Database Not Found:**
   - MongoDB creates databases automatically
   - Ensure correct database name in `.env`

3. **Authentication Errors:**
   - Verify username/password in connection string
   - Check MongoDB user permissions

4. **Port Conflicts:**
   - Default MongoDB port: 27017
   - Change port in connection string if needed

### **Monitoring:**

```bash
# Check MongoDB status
brew services list | grep mongodb

# Connect to MongoDB shell
mongosh mongodb://localhost:27017/employee-tracking

# View collections
show collections

# Query meetings
db.meetings.find().limit(5)

# Query attendance  
db.attendance.find().sort({date: -1}).limit(10)
```

---

## 🎯 Next Steps

1. **Setup MongoDB** using your preferred method
2. **Update `.env`** with your connection string
3. **Start the application** with `npm run dev`
4. **Test functionality** by creating meetings and setting attendance
5. **Monitor database** to verify data is being saved

The system now provides persistent data storage with automatic fallback for reliability! 🎉
