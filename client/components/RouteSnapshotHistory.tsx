import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HttpClient } from "@/lib/httpClient";
import { RouteSnapshot, RouteSnapshotsResponse } from "@shared/api";
import {
  History,
  MapPin,
  Clock,
  Route,
  Calendar,
  Search,
  Filter,
  Eye,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmployeeMap } from "./EmployeeMap";

interface RouteSnapshotHistoryProps {
  employeeId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function RouteSnapshotHistory({
  employeeId,
  isOpen,
  onClose,
}: RouteSnapshotHistoryProps) {
  const [snapshots, setSnapshots] = useState<RouteSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] =
    useState<RouteSnapshot | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();

  const fetchSnapshots = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });

      if (employeeId) {
        params.append("employeeId", employeeId);
      }

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await HttpClient.get(`/api/route-snapshots?${params}`);

      if (response.ok) {
        const data: RouteSnapshotsResponse = await response.json();
        setSnapshots(data.snapshots);
        setTotalPages(data.totalPages);
        setTotal(data.total);
        setCurrentPage(data.page);
      } else {
        throw new Error("Failed to fetch snapshots");
      }
    } catch (error) {
      console.error("Error fetching snapshots:", error);
      toast({
        title: "Error",
        description: "Failed to load route snapshots. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSnapshots(1);
    }
  }, [isOpen, employeeId, statusFilter]);

  const handleDeleteSnapshot = async (snapshotId: string) => {
    if (!confirm("Are you sure you want to delete this snapshot?")) {
      return;
    }

    try {
      const response = await HttpClient.delete(
        `/api/route-snapshots/${snapshotId}`,
      );

      if (response.ok) {
        toast({
          title: "Snapshot Deleted",
          description: "Route snapshot has been deleted successfully",
        });
        fetchSnapshots(currentPage);
      } else {
        throw new Error("Failed to delete snapshot");
      }
    } catch (error) {
      console.error("Error deleting snapshot:", error);
      toast({
        title: "Error",
        description: "Failed to delete snapshot. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredSnapshots = snapshots.filter(
    (snapshot) =>
      snapshot.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      snapshot.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (snapshot.description &&
        snapshot.description.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatDistance = (meters: number) => {
    return meters > 1000
      ? `${(meters / 1000).toFixed(1)} km`
      : `${meters.toFixed(0)} m`;
  };

  const convertSnapshotToEmployeeFormat = (snapshot: RouteSnapshot) => {
    return {
      _id: snapshot.employeeId,
      id: snapshot.employeeId,
      name: snapshot.employeeName,
      email: "",
      phone: "",
      status: "active" as const,
      location: snapshot.startLocation,
      lastUpdate: new Date(snapshot.captureTime).toLocaleString(),
    };
  };

  const convertSnapshotToTrackingSession = (snapshot: RouteSnapshot) => {
    return {
      id: snapshot.trackingSessionId || snapshot.id,
      employeeId: snapshot.employeeId,
      startTime: snapshot.captureTime,
      endTime: snapshot.endLocation ? snapshot.captureTime : undefined,
      startLocation: snapshot.startLocation,
      endLocation: snapshot.endLocation,
      route: snapshot.route,
      totalDistance: snapshot.totalDistance,
      duration: snapshot.duration,
      status: snapshot.status,
    };
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Route Snapshot History
            </DialogTitle>
            <DialogDescription>
              View and manage saved route snapshots
              {employeeId && " for this employee"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col h-[70vh]">
            {/* Filters */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search snapshots..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchSnapshots(currentPage)}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Loading snapshots...
                    </p>
                  </div>
                </div>
              ) : filteredSnapshots.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">
                      No Snapshots Found
                    </h3>
                    <p className="text-muted-foreground">
                      {searchTerm || statusFilter !== "all"
                        ? "Try adjusting your search criteria"
                        : "No route snapshots have been created yet"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-y-auto h-full">
                  <div className="grid gap-4">
                    {filteredSnapshots.map((snapshot) => (
                      <Card
                        key={snapshot.id}
                        className="hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">
                                  {snapshot.title}
                                </h3>
                                <Badge
                                  variant="secondary"
                                  className={
                                    snapshot.status === "completed"
                                      ? "bg-success text-success-foreground"
                                      : "bg-warning text-warning-foreground"
                                  }
                                >
                                  {snapshot.status}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>
                                    {new Date(
                                      snapshot.captureTime,
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Route className="h-4 w-4 text-muted-foreground" />
                                  <span>
                                    {snapshot.snapshotMetadata.routePointsCount}{" "}
                                    points
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span>
                                    {formatDistance(snapshot.totalDistance)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span>
                                    {formatDuration(snapshot.duration)}
                                  </span>
                                </div>
                              </div>

                              <p className="text-sm text-muted-foreground mb-2">
                                <strong>{snapshot.employeeName}</strong>
                              </p>

                              {snapshot.description && (
                                <p className="text-sm text-muted-foreground">
                                  {snapshot.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedSnapshot(snapshot)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleDeleteSnapshot(snapshot.id)
                                }
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredSnapshots.length} of {total} snapshots
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchSnapshots(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchSnapshots(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Snapshot Detail Modal */}
      {selectedSnapshot && (
        <Dialog
          open={!!selectedSnapshot}
          onOpenChange={() => setSelectedSnapshot(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedSnapshot.title}</DialogTitle>
              <DialogDescription>
                Route snapshot captured on{" "}
                {new Date(selectedSnapshot.captureTime).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Snapshot Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Route className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">
                      {selectedSnapshot.snapshotMetadata.routePointsCount}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Route Points
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">
                      {formatDistance(selectedSnapshot.totalDistance)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Distance
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">
                      {selectedSnapshot.meetings.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Meetings
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">
                      {formatDuration(selectedSnapshot.duration)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Duration
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Map Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle>Route Visualization</CardTitle>
                </CardHeader>
                <CardContent>
                  <EmployeeMap
                    employees={[
                      convertSnapshotToEmployeeFormat(selectedSnapshot),
                    ]}
                    height="400px"
                  />
                </CardContent>
              </Card>

              {/* Description */}
              {selectedSnapshot.description && (
                <Card>
                  <CardHeader>
                    <CardTitle>Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedSnapshot.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Meetings */}
              {selectedSnapshot.meetings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Meetings in Snapshot</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedSnapshot.meetings.map((meeting) => (
                        <div
                          key={meeting.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium">
                              {meeting.clientName || "Unknown Client"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {meeting.location.address}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(meeting.startTime).toLocaleString()}
                              {meeting.endTime &&
                                ` - ${new Date(meeting.endTime).toLocaleString()}`}
                            </div>
                          </div>
                          <Badge variant="outline">{meeting.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
