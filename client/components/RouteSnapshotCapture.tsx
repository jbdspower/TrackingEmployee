import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { HttpClient } from "@/lib/httpClient";
import {
  Employee,
  TrackingSession,
  MeetingLog,
  CreateRouteSnapshotRequest,
  RouteSnapshot,
  MapBounds,
  MeetingSnapshot,
} from "@shared/api";
import {
  Camera,
  MapPin,
  Clock,
  Route,
  Save,
  Calendar,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RouteSnapshotCaptureProps {
  employee: Employee;
  trackingSession?: TrackingSession | null;
  meetings: MeetingLog[];
  isOpen: boolean;
  onClose: () => void;
  onSnapshotCreated?: (snapshot: RouteSnapshot) => void;
}

export function RouteSnapshotCapture({
  employee,
  trackingSession,
  meetings,
  isOpen,
  onClose,
  onSnapshotCreated,
}: RouteSnapshotCaptureProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  // Auto-generate title when modal opens
  useEffect(() => {
    if (isOpen && !title) {
      const now = new Date();
      const dateStr = now.toLocaleDateString();
      const timeStr = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setTitle(`${employee.name} Route - ${dateStr} ${timeStr}`);
    }
  }, [isOpen, employee.name, title]);

  // Calculate map bounds from route data
  const calculateMapBounds = (): MapBounds => {
    const allPoints = [];

    // Add tracking route points
    if (trackingSession?.route) {
      allPoints.push(...trackingSession.route);
    }

    // Add meeting locations
    meetings.forEach((meeting) => {
      allPoints.push(meeting.location);
    });

    // Add current employee location
    allPoints.push(employee.location);

    if (allPoints.length === 0) {
      // Default bounds if no points
      return {
        north: employee.location.lat + 0.01,
        south: employee.location.lat - 0.01,
        east: employee.location.lng + 0.01,
        west: employee.location.lng - 0.01,
      };
    }

    const lats = allPoints.map((p) => p.lat);
    const lngs = allPoints.map((p) => p.lng);

    const margin = 0.005; // Add small margin around bounds

    return {
      north: Math.max(...lats) + margin,
      south: Math.min(...lats) - margin,
      east: Math.max(...lngs) + margin,
      west: Math.min(...lngs) - margin,
    };
  };

  // Convert meetings to snapshot format
  const getMeetingSnapshots = (): MeetingSnapshot[] => {
    return meetings.map((meeting) => ({
      id: meeting.id,
      location: meeting.location,
      clientName: meeting.clientName,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      status: meeting.status,
    }));
  };

  const handleCreateSnapshot = async () => {
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for the snapshot",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const snapshotData: CreateRouteSnapshotRequest = {
        employeeId: employee.id,
        employeeName: employee.name,
        trackingSessionId: trackingSession?.id,
        title: title.trim(),
        description: description.trim() || undefined,
        startLocation: trackingSession?.startLocation || employee.location,
        endLocation: trackingSession?.endLocation,
        route: trackingSession?.route || [employee.location],
        meetings: getMeetingSnapshots(),
        totalDistance: trackingSession?.totalDistance || 0,
        duration: trackingSession?.duration,
        status:
          (trackingSession?.status as "active" | "completed" | "paused") ||
          "active",
        mapBounds: calculateMapBounds(),
      };

      const response = await HttpClient.post(
        "/api/route-snapshots",
        snapshotData,
      );

      if (response.ok) {
        const snapshot = await response.json();
        toast({
          title: "Snapshot Created",
          description: "Route snapshot has been saved successfully",
        });
        onSnapshotCreated?.(snapshot);
        onClose();
        setTitle("");
        setDescription("");
      } else {
        throw new Error("Failed to create snapshot");
      }
    } catch (error) {
      console.error("Error creating snapshot:", error);
      toast({
        title: "Error",
        description: "Failed to create route snapshot. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getRouteStats = () => {
    const routePoints = trackingSession?.route?.length || 1;
    const totalDistance = trackingSession?.totalDistance || 0;
    const meetingCount = meetings.length;
    const duration = trackingSession?.duration;

    return {
      routePoints,
      totalDistance,
      meetingCount,
      duration,
    };
  };

  const stats = getRouteStats();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Create Manual Route Snapshot
          </DialogTitle>
          <DialogDescription>
            Manually capture and save {employee.name}'s current route and
            meeting locations for historical reference. Note: Routes are also
            automatically captured when tracking stops.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Snapshot Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Route Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title for this snapshot"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add any additional notes about this route snapshot"
                className="w-full"
                rows={3}
              />
            </div>
          </div>

          {/* Route Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Route Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Route className="h-4 w-4" />
                    Route Points
                  </div>
                  <div className="text-2xl font-bold">{stats.routePoints}</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    Total Distance
                  </div>
                  <div className="text-2xl font-bold">
                    {(stats.totalDistance / 1000).toFixed(1)} km
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Meetings
                  </div>
                  <div className="text-2xl font-bold">{stats.meetingCount}</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Duration
                  </div>
                  <div className="text-2xl font-bold">
                    {stats.duration
                      ? `${Math.floor(stats.duration / 60)}m`
                      : "Active"}
                  </div>
                </div>
              </div>

              {/* Current Location */}
              <div className="pt-4 border-t">
                <div className="space-y-2">
                  <h4 className="font-medium">Current Location</h4>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-1" />
                    <div>
                      <p className="text-sm">{employee.location.address}</p>
                      <p className="text-xs text-muted-foreground">
                        {employee.location.lat.toFixed(6)},{" "}
                        {employee.location.lng.toFixed(6)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tracking Session Info */}
              {trackingSession && (
                <div className="pt-4 border-t">
                  <div className="space-y-2">
                    <h4 className="font-medium">Tracking Session</h4>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={
                          trackingSession.status === "active"
                            ? "bg-success text-success-foreground"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {trackingSession.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Started:{" "}
                        {new Date(trackingSession.startTime).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Meetings */}
              {meetings.length > 0 && (
                <div className="pt-4 border-t">
                  <div className="space-y-2">
                    <h4 className="font-medium">Meetings in Snapshot</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {meetings.slice(0, 3).map((meeting) => (
                        <div
                          key={meeting.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>{meeting.clientName || "Unknown Client"}</span>
                          <Badge variant="outline" className="text-xs">
                            {meeting.status}
                          </Badge>
                        </div>
                      ))}
                      {meetings.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{meetings.length - 3} more meetings
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreateSnapshot} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Snapshot...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Route
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
