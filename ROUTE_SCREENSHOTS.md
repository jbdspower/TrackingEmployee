# Route Screenshot Feature

## Overview

The Route Screenshot feature automatically captures and stores visual representations of employee tracking routes, displaying them as thumbnails in the dashboard history. When employees complete tracking sessions, the system generates route maps showing their movement patterns.

## Features

### 1. Automatic Route Capture
- When an employee ends a tracking session, the system automatically generates a route screenshot
- Screenshots show start points (green), end points (red), and intermediate locations (blue)
- Includes grid lines for scale reference and basic route information

### 2. Thumbnail Display
- 32x32 pixel thumbnails appear in the dashboard meeting history
- Thumbnails are displayed in the "Route" column of the meeting history table
- Hover effect shows an eye icon indicating clickable functionality

### 3. Full Route Modal
- Clicking on thumbnails opens a detailed modal with the full route image
- Modal includes:
  - Full-size route map (800x600 pixels)
  - Session information (ID, duration, route points)
  - Start and end timestamps
  - Start and end location addresses
  - Download functionality for the route image

### 4. Storage System
- Route screenshots are stored in browser localStorage
- Data persists across browser sessions
- Each screenshot is associated with employee ID and tracking session ID

## Technical Implementation

### Files Created/Modified

#### New Files:
1. **`client/lib/routeScreenshot.ts`** - Core utility functions for generating and managing route screenshots
2. **`client/components/RouteImageViewer.tsx`** - React component for displaying route thumbnails and modal

#### Modified Files:
1. **`client/components/LocationTracker.tsx`** - Added screenshot generation when tracking ends
2. **`client/pages/Dashboard.tsx`** - Added route column to meeting history table
3. **`client/components/MeetingHistory.tsx`** - Added route images to meeting history component
4. **`client/pages/Tracking.tsx`** - Updated to associate meetings with tracking sessions
5. **`shared/api.ts`** - Added route screenshot information to MeetingLog interface

### Key Functions

#### `generateRouteScreenshot(route, width, height)`
- Creates a visual route map using HTML5 Canvas
- Plots GPS coordinates on a grid with proper scaling
- Marks start (green), end (red), and intermediate points (blue)
- Returns base64 encoded PNG image

#### `generateThumbnail(imageDataUrl, size)`
- Creates a smaller thumbnail version of the full route image
- Default size is 32x32 pixels for dashboard display

#### `storeRouteScreenshot(employeeId, sessionId, fullImage, thumbnail, route)`
- Stores route screenshots in localStorage with metadata
- Associates images with specific employees and tracking sessions

#### `getRouteScreenshot(employeeId, sessionId)`
- Retrieves stored route screenshots by employee and session ID
- Returns null if no screenshot exists

## Usage

### For Users
1. **Start Tracking**: Begin tracking on the employee tracking page
2. **Move Around**: The system captures GPS coordinates as you move
3. **End Tracking**: When you stop tracking, a route screenshot is automatically generated
4. **View Routes**: In the dashboard history, click on route thumbnails to see full route maps
5. **Download**: Use the download button in the route modal to save route images

### For Developers

#### Generating Route Screenshots
```typescript
import { generateRouteScreenshot, generateThumbnail, storeRouteScreenshot } from '@/lib/routeScreenshot';

// After tracking session ends
const fullImage = await generateRouteScreenshot(routeCoordinates, 800, 600);
const thumbnail = await generateThumbnail(fullImage, 32);
storeRouteScreenshot(employeeId, sessionId, fullImage, thumbnail, routeCoordinates);
```

#### Displaying Route Images
```tsx
import { RouteImageViewer } from '@/components/RouteImageViewer';
import { getRouteScreenshot } from '@/lib/routeScreenshot';

const routeData = getRouteScreenshot(employeeId, sessionId);
return <RouteImageViewer routeData={routeData} employeeName={employeeName} />;
```

## Data Structure

### Route Screenshot Data
```typescript
{
  employeeId: string;
  sessionId: string;
  fullImage: string; // base64 PNG data
  thumbnail: string; // base64 PNG data (32x32)
  routeInfo: {
    pointCount: number;
    startTime: string;
    endTime: string;
    startAddress: string;
    endAddress: string;
  };
  createdAt: string;
}
```

## Browser Compatibility
- Requires HTML5 Canvas support (all modern browsers)
- Uses localStorage for data persistence
- Geolocation API required for tracking functionality

## Storage Limitations
- localStorage has size limits (typically 5-10MB per domain)
- Route screenshots are stored as base64 strings which are larger than binary
- Automatic cleanup may be needed for high-volume usage

## Future Enhancements
- Server-side storage for route screenshots
- Route optimization and analysis
- Export functionality for multiple routes
- Integration with mapping services for better route visualization
- Compression of route data for better storage efficiency
