import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGeolocation } from "@/hooks/useGeolocation";
import { HttpClient } from "@/lib/httpClient";
import { TrackingSession, LocationData } from "@shared/api";
import { routingService } from "@/lib/routingService";
import {
  MapPin,
  Navigation,
  AlertCircle,
  Clock,
  Loader2,
  CheckCircle,
  Timer,
  Route,
  Ruler,
  Shield,
} from "lucide-react";

interface LocationTrackerProps {
  employeeId: string;
  employeeName: string;
  onLocationUpdate?: (lat: number, lng: number, accuracy: number) => void;
  trackingEnabled?: boolean;
  onTrackingSessionStart?: (session: TrackingSession) => void;
  onTrackingSessionEnd?: (session: TrackingSession) => void;
}

export function LocationTracker({
  employeeId,
  employeeName,
  onLocationUpdate,
  trackingEnabled = false,
  onTrackingSessionStart,
  onTrackingSessionEnd,
}: LocationTrackerProps) {
  const [isTracking, setIsTracking] = useState(trackingEnabled);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [failureCount, setFailureCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);

  // Enhanced tracking state
  const [currentSession, setCurrentSession] = useState<TrackingSession | null>(
    null,
  );
  const [trackingStartTime, setTrackingStartTime] = useState<Date | null>(null);
  const [trackingEndTime, setTrackingEndTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [routeCoordinates, setRouteCoordinates] = useState<LocationData[]>([]);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // PWA background tracking state
  const [isPWAMode, setIsPWAMode] = useState(false);
  const [backgroundTrackingSupported, setBackgroundTrackingSupported] = useState(false);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

  const { latitude, longitude, accuracy, error, loading, getCurrentPosition } =
    useGeolocation({
      enableHighAccuracy: true,
      maximumAge: 60000, // 1 minute
      timeout: 30000, // 30 seconds
      watchPosition: isTracking,
    });

  // PWA Detection and Service Worker Setup
  useEffect(() => {
    // Check if running as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroidPWA = window.matchMedia('(display-mode: standalone)').matches;

    setIsPWAMode(isStandalone || isAndroidPWA);

    // Check for background tracking capabilities
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasNotifications = 'Notification' in window;
    const hasBackgroundSync = 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype;

    setBackgroundTrackingSupported(hasServiceWorker && hasNotifications);

    // Set up service worker communication
    if (hasServiceWorker) {
      navigator.serviceWorker.ready.then((registration) => {
        console.log('Service Worker ready for location tracking');
        setServiceWorkerReady(true);

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      });
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  // Handle messages from service worker
  const handleServiceWorkerMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type === 'LOCATION_UPDATE') {
      const locationData = event.data.payload;
      console.log('Received background location update:', locationData);

      // Update local state with background location
      if (isTracking) {
        const newLocation: LocationData = {
          lat: locationData.latitude,
          lng: locationData.longitude,
          address: `${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`,
          timestamp: locationData.timestamp,
        };

        setRouteCoordinates((prevRoute) => {
          const newRoute = [...prevRoute, newLocation];

          // Calculate distance if we have a previous point
          if (prevRoute.length > 0) {
            const lastPoint = prevRoute[prevRoute.length - 1];
            const distance = calculateDistance(
              lastPoint.lat,
              lastPoint.lng,
              locationData.latitude,
              locationData.longitude,
            );
            setTotalDistance((prev) => prev + distance);
          }

          return newRoute;
        });
      }
    }

    if (event.data?.type === 'GET_EMPLOYEE_ID') {
      // Send employee ID to service worker
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'EMPLOYEE_ID_RESPONSE',
          payload: employeeId
        });
      }
    }
  }, [isTracking, employeeId, calculateDistance]);

  // Calculate distance between two points using Haversine formula
  const calculateDistance = useCallback(
    (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371e3; // Earth's radius in meters
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lng1 - lng2) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c; // Distance in meters
    },
    [],
  );

  // Timer effect
  useEffect(() => {
    if (isTracking && trackingStartTime) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Date.now() - trackingStartTime.getTime());
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTracking, trackingStartTime]);

  // Update location on server when position changes (with rate limiting and route tracking)
  useEffect(() => {
    if (latitude && longitude && accuracy && isTracking) {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTime;

      // Rate limit: only update every 10 seconds minimum
      if (timeSinceLastUpdate >= 10000 || lastUpdateTime === 0) {
        updateLocationOnServer(latitude, longitude, accuracy);

        // Add to route if tracking is active
        const newLocation: LocationData = {
          lat: latitude,
          lng: longitude,
          address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          timestamp: new Date().toISOString(),
        };

        setRouteCoordinates((prevRoute) => {
          const newRoute = [...prevRoute, newLocation];

          // Calculate distance if we have a previous point
          if (prevRoute.length > 0) {
            const lastPoint = prevRoute[prevRoute.length - 1];

            // Use straight-line distance for real-time tracking (faster)
            // Road-based distance will be calculated when route is finalized
            const distance = calculateDistance(
              lastPoint.lat,
              lastPoint.lng,
              latitude,
              longitude,
            );
            setTotalDistance((prev) => prev + distance);
          }

          return newRoute;
        });

        setLastUpdate(new Date());
        setUpdateCount((prev) => prev + 1);
        setLastUpdateTime(now);
        onLocationUpdate?.(latitude, longitude, accuracy);
      } else {
        console.log(
          `Rate limited: ${Math.ceil((10000 - timeSinceLastUpdate) / 1000)}s remaining`,
        );
      }
    }
  }, [
    latitude,
    longitude,
    accuracy,
    isTracking,
    onLocationUpdate,
    lastUpdateTime,
    calculateDistance,
  ]);

  const updateLocationOnServer = async (
    lat: number,
    lng: number,
    acc: number,
    retryCount: number = 0,
  ) => {
    try {
      console.log("Attempting to update location:", {
        employeeId,
        lat,
        lng,
        accuracy: acc,
        retryCount,
      });

      const response = await HttpClient.put(
        `/api/employees/${employeeId}/location`,
        {
          lat,
          lng,
          accuracy: acc,
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to update location: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const result = await response.json();
      console.log("Location update successful:", result);
      setUpdateError(null);
      setFailureCount(0);
    } catch (error) {
      console.error("Error updating location:", error);

      // Retry once if it's a network error and we haven't retried yet
      if (
        retryCount < 1 &&
        error instanceof TypeError &&
        error.message.includes("fetch")
      ) {
        console.log("Retrying location update after network error...");
        setTimeout(
          () => updateLocationOnServer(lat, lng, acc, retryCount + 1),
          3000,
        );
        return;
      }

      setUpdateError(error instanceof Error ? error.message : "Unknown error");
      setFailureCount((prev) => prev + 1);

      // Disable tracking after 3 consecutive failures to prevent spam
      if (failureCount >= 2) {
        setIsTracking(false);
        console.warn("Disabling tracking due to repeated failures");
      }
    }
  };

  const handleStartTracking = async () => {
    const now = new Date();
    setTrackingStartTime(now);
    setTrackingEndTime(null);
    setElapsedTime(0);
    setRouteCoordinates([]);
    setTotalDistance(0);
    setIsTracking(true);

    // Request wake lock to prevent screen from sleeping during tracking
    try {
      if ('wakeLock' in navigator) {
        const wakeLockSentinel = await navigator.wakeLock.request('screen');
        setWakeLock(wakeLockSentinel);
        console.log('Wake lock acquired for better tracking');
      }
    } catch (error) {
      console.warn('Wake lock failed:', error);
    }

    // Get initial position
    getCurrentPosition();

    // Start background tracking if PWA capabilities are available
    if (serviceWorkerReady && backgroundTrackingSupported) {
      console.log('Starting background tracking via Service Worker');
      navigator.serviceWorker.controller?.postMessage({
        type: 'START_BACKGROUND_TRACKING',
        payload: { employeeId }
      });
    }

    // Create tracking session immediately, even if coordinates aren't ready yet
    const sessionId = `session_${employeeId}_${now.getTime()}`;
    const startLocation = {
      lat: latitude || 0,
      lng: longitude || 0,
      address: latitude && longitude ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : "Getting location...",
      timestamp: now.toISOString(),
    };

    const session: TrackingSession = {
      id: sessionId,
      employeeId,
      startTime: now.toISOString(),
      startLocation,
      route: [],
      totalDistance: 0,
      status: "active",
    };

    console.log("Starting tracking session:", session);
    setCurrentSession(session);
    onTrackingSessionStart?.(session);
  };

  const handleStopTracking = async () => {
    const now = new Date();
    setTrackingEndTime(now);
    setIsTracking(false);

    // Release wake lock
    if (wakeLock) {
      try {
        await wakeLock.release();
        setWakeLock(null);
        console.log('Wake lock released');
      } catch (error) {
        console.warn('Failed to release wake lock:', error);
      }
    }

    // Stop background tracking
    if (serviceWorkerReady) {
      console.log('Stopping background tracking via Service Worker');
      navigator.serviceWorker.controller?.postMessage({
        type: 'STOP_BACKGROUND_TRACKING'
      });
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    console.log("Stopping tracking - Debug info:", {
      hasCurrentSession: !!currentSession,
      hasCoordinates: !!(latitude && longitude),
      latitude,
      longitude,
      routePointsCount: routeCoordinates.length,
      totalDistance,
      elapsedTime
    });

    // Update current session - create session even if coordinates aren't perfect
    if (currentSession) {
      const endLocation = {
        lat: latitude || currentSession.startLocation.lat,
        lng: longitude || currentSession.startLocation.lng,
        address: latitude && longitude ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : "Location unavailable",
        timestamp: now.toISOString(),
      };

      let finalDistance = totalDistance;

      // Try to get more accurate road-based distance calculation
      if (routeCoordinates.length >= 2) {
        try {
          console.log("Calculating accurate road-based distance...");
          const routeData = await routingService.getRouteForPoints(routeCoordinates);
          if (routeData.totalDistance > 0) {
            finalDistance = routeData.totalDistance;
            console.log(`Distance updated: ${(finalDistance / 1000).toFixed(2)} km (was ${(totalDistance / 1000).toFixed(2)} km)`);
          }
        } catch (error) {
          console.warn("Failed to calculate road-based distance, using GPS distance:", error);
        }
      }

      const updatedSession: TrackingSession = {
        ...currentSession,
        endTime: now.toISOString(),
        endLocation,
        route: routeCoordinates.length > 0 ? routeCoordinates : [currentSession.startLocation],
        totalDistance: finalDistance,
        duration: elapsedTime / 1000, // Convert to seconds
        status: "completed",
      };

      console.log("Calling onTrackingSessionEnd with session:", updatedSession);
      setCurrentSession(updatedSession);
      onTrackingSessionEnd?.(updatedSession);
    } else {
      console.log("Cannot end tracking session - no current session");
    }
  };

  const getAccuracyColor = (acc: number | null) => {
    if (!acc) return "bg-muted";
    if (acc <= 10) return "bg-success";
    if (acc <= 50) return "bg-warning";
    return "bg-destructive";
  };

  const getAccuracyText = (acc: number | null) => {
    if (!acc) return "Unknown";
    if (acc <= 10) return "High";
    if (acc <= 50) return "Medium";
    return "Low";
  };

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    } else {
      return `${Math.round(meters)} m`;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span>Location Tracking</span>
          </div>
          <Badge
            variant={isTracking ? "default" : "secondary"}
            className={isTracking ? "bg-success" : ""}
          >
            {isTracking ? "Active" : "Inactive"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Employee Info */}
        <div className="text-sm text-muted-foreground">
          Tracking for: <span className="font-medium">{employeeName}</span>
        </div>

        {/* Tracking Session Info */}
        {isTracking && trackingStartTime && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm">
                <Timer className="h-4 w-4 text-primary" />
                <span className="font-medium">Session Active</span>
              </div>
              <div className="text-sm font-mono text-primary">
                {formatDuration(elapsedTime)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-muted-foreground">Started</div>
                <div className="font-medium">
                  {trackingStartTime.toLocaleTimeString()}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Distance</div>
                <div className="font-medium">
                  {formatDistance(totalDistance)}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Route className="h-3 w-3" />
              <span>Route points: {routeCoordinates.length}</span>
            </div>
          </div>
        )}

        {/* Completed Session Info */}
        {!isTracking && trackingEndTime && trackingStartTime && (
          <div className="bg-success/5 border border-success/20 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="font-medium">Last Session</span>
              </div>
              <div className="text-sm font-mono text-success">
                {formatDuration(
                  trackingEndTime.getTime() - trackingStartTime.getTime(),
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-muted-foreground">Started</div>
                <div className="font-medium">
                  {trackingStartTime.toLocaleTimeString()}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Ended</div>
                <div className="font-medium">
                  {trackingEndTime.toLocaleTimeString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-muted-foreground flex items-center">
                  <Ruler className="h-3 w-3 mr-1" />
                  Distance
                </div>
                <div className="font-medium">
                  {formatDistance(totalDistance)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground flex items-center">
                  <Route className="h-3 w-3 mr-1" />
                  Points
                </div>
                <div className="font-medium">{routeCoordinates.length}</div>
              </div>
            </div>
          </div>
        )}

        {/* Current Status */}
        <div className="space-y-2">
          {loading && (
            <div className="flex items-center space-x-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Getting location...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {updateError && (
            <div className="flex items-center space-x-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>
                Update failed: {updateError} (Failures: {failureCount})
              </span>
            </div>
          )}

          {latitude && longitude && !loading && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-success">
                <CheckCircle className="h-4 w-4" />
                <span>Location acquired</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Latitude</div>
                  <div className="font-mono">{latitude.toFixed(6)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Longitude</div>
                  <div className="font-mono">{longitude.toFixed(6)}</div>
                </div>
              </div>

              {accuracy && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Accuracy
                  </span>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`h-2 w-2 rounded-full ${getAccuracyColor(accuracy)}`}
                    ></div>
                    <span className="text-sm">
                      {getAccuracyText(accuracy)} ({Math.round(accuracy)}m)
                    </span>
                  </div>
                </div>
              )}

              {lastUpdate && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Last update: {lastUpdate.toLocaleTimeString()} (
                    {updateCount} updates)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex space-x-2">
          {!isTracking ? (
            <Button onClick={handleStartTracking} className="flex-1">
              <Navigation className="h-4 w-4 mr-2" />
              LogIn
            </Button>
          ) : (
            <Button
              onClick={handleStopTracking}
              variant="destructive"
              className="flex-1"
            >
              LogOut
            </Button>
          )}

          <Button variant="outline" onClick={getCurrentPosition}>
            <MapPin className="h-4 w-4 mr-2" />
            Update Now
          </Button>
        </div>

        {/* Instructions */}
        {!isTracking && (
          <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-md">
            <p>
              <strong>Note:</strong> Location tracking requires permission and
              works best outdoors or near windows. High accuracy mode uses GPS
              and may drain battery faster.
            </p>
            <p className="mt-2">
              <strong>Auto-capture:</strong> Route map will be automatically saved
              when you stop tracking.
            </p>
          </div>
        )}

        {/* Active tracking info */}
        {isTracking && (
          <div className="text-xs text-info p-3 bg-info/10 border border-info/20 rounded-md">
            <p className="flex items-center">
              <Route className="h-3 w-3 mr-1" />
              <strong>Route will be auto-captured when tracking stops</strong>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
