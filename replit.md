# Employee Tracking System

## Overview
A full-stack employee tracking and meeting management application built with React, Express, MongoDB, and Vite. This application enables field employees to track their locations, manage meetings, and allows administrators to monitor employee activities and analytics in real-time.

## Current State
- **Last Updated**: October 25, 2025
- **Status**: Configured for Replit environment and ready to run
- **Environment**: Development mode with MongoDB cloud database connection

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 6
- **Routing**: React Router 6 (SPA mode)
- **Styling**: TailwindCSS 3 with Radix UI components
- **Maps**: Leaflet + React Leaflet for location tracking
- **State**: React Query for server state management
- **Icons**: Lucide React

### Backend
- **Server**: Express 4 integrated with Vite dev server
- **Database**: MongoDB with Mongoose ODM
- **API**: RESTful endpoints for employees, meetings, tracking, analytics

### Infrastructure
- **Port**: 5000 (frontend + backend on same port via Vite middleware)
- **Host**: 0.0.0.0 (configured for Replit proxy)
- **Database**: MongoDB Atlas (cloud-hosted)

## Project Structure

```
client/                   # React frontend application
├── components/           # React components
│   ├── ui/              # Reusable UI components (Radix UI + Tailwind)
│   ├── AddCustomerEmployeeModal.tsx
│   ├── CompanySelector.tsx
│   ├── EmployeeMap.tsx
│   ├── LocationTracker.tsx
│   ├── MeetingHistory.tsx
│   └── ...
├── pages/               # Route components
│   ├── Dashboard.tsx    # Admin dashboard
│   ├── Tracking.tsx     # Employee tracking view
│   ├── DataManagement.tsx
│   ├── TeamManagement.tsx
│   └── Index.tsx        # Home page
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and services
│   ├── apiKeyConfig.ts
│   ├── httpClient.ts
│   ├── routingService.ts
│   └── utils.ts
├── App.tsx             # Main app with routing
└── global.css          # Tailwind config and global styles

server/                  # Express backend
├── config/
│   └── database.ts     # MongoDB connection management
├── models/             # Mongoose schemas
│   ├── Employee.ts
│   ├── Meeting.ts
│   ├── MeetingHistory.ts
│   ├── Attendance.ts
│   ├── TrackingSession.ts
│   └── RouteSnapshot.ts
├── routes/             # API route handlers
│   ├── employees.ts    # Employee CRUD operations
│   ├── meetings.ts     # Meeting management
│   ├── tracking.ts     # Location tracking
│   ├── analytics.ts    # Analytics and reporting
│   ├── data-sync.ts    # External data synchronization
│   └── ...
└── index.ts            # Server setup and route registration

shared/                  # Shared TypeScript types
└── api.ts              # API interfaces

scripts/                 # Utility scripts
├── test-mongodb.js     # Database connection tester
├── quick-data-sync.js
└── debug-meetings.js
```

## Key Features

### For Field Employees
1. **Location Tracking**: Automatic background location tracking
2. **Meeting Management**: 
   - Start/end meetings with location capture
   - Select company and lead
   - Add meeting attendees and discussion notes
3. **Route History**: View past routes and meeting locations

### For Administrators
1. **Dashboard**: Real-time employee status and analytics
2. **Employee Analytics**: 
   - Duty hours and attendance tracking
   - Meeting history and trends
   - Lead interaction history
3. **Team Management**: Employee roster and status management
4. **Data Sync**: Integration with external CRM/ERP systems

## Environment Configuration

### Required Environment Variables
The application uses MongoDB Atlas (cloud database) with the following configuration:

- `MONGODB_URI`: MongoDB connection string (currently using cloud Atlas)
- `DB_NAME`: Database name (employee-tracking)
- `PORT`: Server port (5000 for Replit)
- `EXTERNAL_USER_API`: External user API endpoint
- `EXTERNAL_CUSTOMER_API`: External customer API endpoint
- `EXTERNAL_LEAD_API`: External lead API endpoint

### Optional Variables
- `VITE_OPENROUTESERVICE_API_KEY`: For enhanced routing features (uses public demo if not set)

## API Endpoints

### Employees
- `GET /api/employees` - List all employees
- `POST /api/employees` - Create employee
- `GET /api/employees/:id` - Get employee details
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee
- `PUT /api/employees/:id/location` - Update employee location
- `POST /api/employees/refresh-locations` - Refresh from external API

### Meetings
- `GET /api/meetings` - List meetings
- `POST /api/meetings` - Create meeting
- `GET /api/meetings/:id` - Get meeting details
- `PUT /api/meetings/:id` - Update meeting
- `DELETE /api/meetings/:id` - Delete meeting

### Tracking
- `GET /api/tracking-sessions` - List tracking sessions
- `POST /api/tracking-sessions` - Start tracking session
- `POST /api/tracking-sessions/:id/location` - Add location point
- `GET /api/meeting-history` - Get meeting history
- `POST /api/meeting-history` - Add to meeting history

### Analytics
- `GET /api/analytics/employees` - Employee analytics
- `GET /api/analytics/employee-details/:employeeId` - Detailed employee data
- `GET /api/analytics/lead-history/:leadId` - Lead interaction history
- `POST /api/analytics/save-attendance` - Save attendance record
- `GET /api/analytics/trends` - Meeting trends

### Data Sync
- `POST /api/data-sync` - Sync data from external systems
- `GET /api/data-status` - Get sync status

## Database Schema

### Collections
1. **employees**: Employee master data
2. **meetings**: Active and completed meetings
3. **meeting_history**: Historical meeting records
4. **attendance**: Daily attendance records
5. **tracking_sessions**: GPS tracking sessions
6. **route_snapshots**: Route snapshots for testing/debugging

## Development

### Commands
- `npm run dev` - Start development server (frontend + backend)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm test` - Run tests
- `npm run test:mongodb` - Test MongoDB connection
- `npm run sync-data` - Sync data from external APIs

### Development Notes
- Single-port development (5000) with Vite + Express integration
- Hot reload enabled for both frontend and backend
- MongoDB connection with automatic fallback to in-memory storage
- CORS enabled for API access

## Replit-Specific Configuration

### Port Configuration
- Application runs on port 5000 (Replit standard)
- Host set to 0.0.0.0 for proper proxy routing
- `allowedHosts: true` to bypass host header verification

### Database
- Uses MongoDB Atlas cloud database (already configured)
- Connection string stored in environment variables
- No local MongoDB installation required

### Deployment
- Configured for Replit Autoscale deployment
- Build step compiles client and server separately
- Production server serves built SPA with API routes

## Recent Changes
- **Oct 25, 2025**: Initial Replit setup
  - Updated Vite config for Replit environment (port 5000, host 0.0.0.0)
  - Enabled allowedHosts for proxy compatibility
  - Verified MongoDB cloud connection
  - Created development workflow

## User Preferences
None documented yet.
