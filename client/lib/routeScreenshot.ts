import { LocationData } from "@shared/api";

// Utility to generate a simple route image using Canvas API
export const generateRouteScreenshot = async (
  route: LocationData[],
  width: number = 800,
  height: number = 600
): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || route.length === 0) {
      resolve('');
      return;
    }

    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Calculate bounds
    const lats = route.map(p => p.lat);
    const lngs = route.map(p => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Add padding
    const padding = 50;
    const plotWidth = width - 2 * padding;
    const plotHeight = height - 2 * padding;

    // Normalize coordinates
    const normalizeX = (lng: number) => {
      if (maxLng === minLng) return width / 2;
      return padding + ((lng - minLng) / (maxLng - minLng)) * plotWidth;
    };
    
    const normalizeY = (lat: number) => {
      if (maxLat === minLat) return height / 2;
      return padding + ((maxLat - lat) / (maxLat - minLat)) * plotHeight;
    };

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = padding + (i / 10) * plotWidth;
      const y = padding + (i / 10) * plotHeight;
      
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw route line
    if (route.length > 1) {
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      const startX = normalizeX(route[0].lng);
      const startY = normalizeY(route[0].lat);
      ctx.moveTo(startX, startY);
      
      for (let i = 1; i < route.length; i++) {
        const x = normalizeX(route[i].lng);
        const y = normalizeY(route[i].lat);
        ctx.lineTo(x, y);
      }
      
      ctx.stroke();
    }

    // Draw start point (green)
    if (route.length > 0) {
      const startX = normalizeX(route[0].lng);
      const startY = normalizeY(route[0].lat);
      
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(startX, startY, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Label
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.fillText('START', startX + 12, startY - 8);
    }

    // Draw end point (red)
    if (route.length > 1) {
      const endX = normalizeX(route[route.length - 1].lng);
      const endY = normalizeY(route[route.length - 1].lat);
      
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(endX, endY, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Label
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.fillText('END', endX + 12, endY - 8);
    }

    // Draw intermediate points (blue)
    for (let i = 1; i < route.length - 1; i++) {
      const x = normalizeX(route[i].lng);
      const y = normalizeY(route[i].lat);
      
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Add title
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    const title = `Route Map (${route.length} points)`;
    const titleWidth = ctx.measureText(title).width;
    ctx.fillText(title, (width - titleWidth) / 2, 30);

    // Add distance if available
    ctx.font = '12px Arial';
    const dateText = new Date(route[0].timestamp).toLocaleDateString();
    const timeText = `${new Date(route[0].timestamp).toLocaleTimeString()} - ${new Date(route[route.length - 1].timestamp).toLocaleTimeString()}`;
    ctx.fillText(dateText, 20, height - 30);
    ctx.fillText(timeText, 20, height - 15);

    // Convert to base64
    const imageDataUrl = canvas.toDataURL('image/png');
    resolve(imageDataUrl);
  });
};

// Generate thumbnail from full screenshot
export const generateThumbnail = async (imageDataUrl: string, size: number = 32): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      resolve('');
      return;
    }

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = imageDataUrl;
  });
};

// Store route screenshot in localStorage with employee and session info
export const storeRouteScreenshot = (
  employeeId: string,
  sessionId: string,
  fullImage: string,
  thumbnail: string,
  route: LocationData[]
) => {
  const key = `route_screenshot_${employeeId}_${sessionId}`;
  const data = {
    employeeId,
    sessionId,
    fullImage,
    thumbnail,
    routeInfo: {
      pointCount: route.length,
      startTime: route[0]?.timestamp,
      endTime: route[route.length - 1]?.timestamp,
      startAddress: route[0]?.address,
      endAddress: route[route.length - 1]?.address,
    },
    createdAt: new Date().toISOString(),
  };
  
  try {
    localStorage.setItem(key, JSON.stringify(data));
    console.log(`Route screenshot stored for session ${sessionId}`);
  } catch (error) {
    console.error('Failed to store route screenshot:', error);
  }
};

// Retrieve route screenshot
export const getRouteScreenshot = (employeeId: string, sessionId: string) => {
  const key = `route_screenshot_${employeeId}_${sessionId}`;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to retrieve route screenshot:', error);
    return null;
  }
};

// Get all route screenshots for an employee
export const getEmployeeRouteScreenshots = (employeeId: string) => {
  const screenshots: any[] = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`route_screenshot_${employeeId}_`)) {
        const data = localStorage.getItem(key);
        if (data) {
          screenshots.push(JSON.parse(data));
        }
      }
    }
  } catch (error) {
    console.error('Failed to retrieve employee route screenshots:', error);
  }
  
  return screenshots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};
