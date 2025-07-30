import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LocationTracker } from "@/components/LocationTracker";
import { EmployeeMap } from "@/components/EmployeeMap";
import { StartMeetingModal } from "@/components/StartMeetingModal";
import { EndMeetingModal } from "@/components/EndMeetingModal";
import { MeetingHistory } from "@/components/MeetingHistory";
import { HttpClient } from "@/lib/httpClient";
import {
  Employee,
  MeetingLog,
  MeetingDetails,
  TrackingSession,
} from "@shared/api";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Phone,
  Mail,
  Navigation,
  Calendar,
  Plus,
  MessageSquare,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

export default function Tracking() {
  const navigate = useNavigate();
  const { employeeId } = useParams<{ employeeId: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [meetings, setMeetings] = useState<MeetingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [isStartMeetingModalOpen, setIsStartMeetingModalOpen] = useState(false);
  const [isStartingMeeting, setIsStartingMeeting] = useState(false);
  const [isEndMeetingModalOpen, setIsEndMeetingModalOpen] = useState(false);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [currentTrackingSession, setCurrentTrackingSession] =
    useState<TrackingSession | null>(null);
  const [isMeetingHistoryOpen, setIsMeetingHistoryOpen] = useState(false);

  useEffect(() => {
    if (!employeeId) {
      navigate("/");
      return;
    }

    // Add small delay to ensure HttpClient is properly initialized
    const initializeData = async () => {
      try {
        await Promise.all([fetchEmployee(), fetchMeetings()]);
      } catch (error) {
        console.error("Failed to initialize tracking data:", error);
        // Continue anyway - the individual functions handle their own errors
      }
    };

    initializeData();
  }, [employeeId, navigate]);

  const fetchEmployee = async (retryCount = 0) => {
    try {
      console.log("Fetching employee:", { employeeId, retryCount });

      const response = await HttpClient.get(`/api/employees/${employeeId}`);

      if (response.ok) {
        const data = await response.json();
        setEmployee(data);
        console.log("Employee data fetched successfully:", data);
      } else {
        const errorText = await response.text();
        console.error(
          `Failed to fetch employee: ${response.status} ${response.statusText} - ${errorText}`,
        );
        // Set some fallback data or show error state
        setEmployee(null);
      }
    } catch (error) {
      console.error("Error fetching employee:", error);

      // Retry once if it's a network error and we haven't retried yet
      if (
        retryCount < 1 &&
        error instanceof TypeError &&
        error.message.includes("fetch")
      ) {
        console.log("Retrying employee fetch after network error...");
        setTimeout(() => fetchEmployee(retryCount + 1), 2000);
        return;
      }

      // Don't crash the app - just log the error and continue
      setEmployee(null);
    }
  };

  const fetchMeetings = async (retryCount = 0) => {
    try {
      console.log("Fetching meetings:", { employeeId, retryCount });

      const response = await HttpClient.get(
        `/api/meetings?employeeId=${employeeId}&limit=5`,
      );

      if (response.ok) {
        const data = await response.json();
        setMeetings(data.meetings || []);
        console.log("Meetings data fetched successfully:", data);
      } else {
        const errorText = await response.text();
        console.error(
          `Failed to fetch meetings: ${response.status} ${response.statusText} - ${errorText}`,
        );
        // Set empty array to avoid crashes
        setMeetings([]);
      }
    } catch (error) {
      console.error("Error fetching meetings:", error);

      // Retry once if it's a network error and we haven't retried yet
      if (
        retryCount < 1 &&
        error instanceof TypeError &&
        error.message.includes("fetch")
      ) {
        console.log("Retrying meetings fetch after network error...");
        setTimeout(() => fetchMeetings(retryCount + 1), 2000);
        return;
      }

      // Don't crash the app - just set empty array and continue
      setMeetings([]);
    } finally {
      // Always set loading to false after the first attempt or any retry
      setLoading(false);
    }
  };

  const handleLocationUpdate = (lat: number, lng: number, accuracy: number) => {
    console.log("Location updated:", { lat, lng, accuracy });
    // Refresh employee data to get updated location
    fetchEmployee();
  };

  const openInExternalMap = (lat: number, lng: number, address: string) => {
    // Try to open in Google Maps app first, fallback to web
    const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    const appleMapUrl = `https://maps.apple.com/?q=${lat},${lng}`;

    // Check if user is on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isIOS) {
      window.open(appleMapUrl, "_blank");
    } else {
      window.open(googleMapsUrl, "_blank");
    }
  };

  const handleCall = (phoneNumber: string) => {
    // Use tel: protocol to initiate call on mobile devices
    window.location.href = `tel:${phoneNumber}`;
  };

  const handleEmail = (email: string, employeeName: string) => {
    // Use mailto: protocol to open email client
    const subject = encodeURIComponent(
      `Regarding Field Operations - ${employeeName}`,
    );
    const body = encodeURIComponent(
      `Hi ${employeeName.split(" ")[0]},\n\nI wanted to follow up regarding your current field operations.\n\nBest regards`,
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const handleSendMessage = (phoneNumber: string, employeeName: string) => {
    // Use SMS protocol for mobile messaging
    const message = encodeURIComponent(
      `Hi ${employeeName.split(" ")[0]}, checking in on your current location and status.`,
    );
    window.location.href = `sms:${phoneNumber}?body=${message}`;
  };

  const [isEndingMeeting, setIsEndingMeeting] = useState<string | null>(null);

  const handleEndMeetingClick = (meetingId: string) => {
    console.log("handleEndMeetingClick called with meetingId:", meetingId);
    setActiveMeetingId(meetingId);
    setIsEndMeetingModalOpen(true);
  };

  const handleEndMeetingAttempt = () => {
    console.log("End meeting attempt. Employee status:", employee?.status, "Available meetings:", meetings);

    // Find the active meeting for this employee
    const activeMeeting = meetings.find(
      (meeting) => meeting.status === "in-progress",
    );

    if (activeMeeting) {
      handleEndMeetingClick(activeMeeting.id);
    } else {
      console.error("No active meeting found to end. Available meetings:", meetings);
      alert("No active meeting found for this employee. Please start a meeting first.");
    }
  };

  const handleEndMeetingWithDetails = async (
    meetingDetails: MeetingDetails,
  ) => {
    if (!activeMeetingId) return;

    setIsEndingMeeting(activeMeetingId);
    try {
      console.log(
        "Ending meeting with details:",
        activeMeetingId,
        meetingDetails,
      );

      // End the meeting
      const response = await HttpClient.put(
        `/api/meetings/${activeMeetingId}`,
        {
          status: "completed",
          endTime: new Date().toISOString(),
          meetingDetails,
        },
      );

      if (response.ok) {
        console.log("Meeting ended successfully");

        // Add to meeting history (always add, even without tracking session)
        try {
          // Get the current meeting data to extract lead information
          const currentMeeting = meetings.find(m => m.id === activeMeetingId);

          console.log("Attempting to add meeting to history with details:", {
            sessionId: currentTrackingSession?.id || `manual_${Date.now()}`,
            employeeId,
            meetingDetails,
            leadId: currentMeeting?.leadId,
            leadInfo: currentMeeting?.leadInfo,
          });

          const historyResponse = await HttpClient.post(
            "/api/meeting-history",
            {
              sessionId: currentTrackingSession?.id || `manual_${Date.now()}`,
              employeeId,
              meetingDetails,
              leadId: currentMeeting?.leadId,
              leadInfo: currentMeeting?.leadInfo,
            },
          );

          if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            console.log("Meeting added to history successfully:", historyData);
          } else {
            const errorText = await historyResponse.text();
            console.error("Failed to add meeting to history:", historyResponse.status, errorText);
          }
        } catch (historyError) {
          console.error("Error adding meeting to history:", historyError);
        }

        // Update employee status to active
        await HttpClient.put(`/api/employees/${employeeId}/status`, {
          status: "active",
        });

        // Refresh data
        await Promise.all([fetchMeetings(), fetchEmployee()]);
      } else {
        const errorText = await response.text();
        console.error("Failed to end meeting:", response.status, errorText);
        throw new Error(`Failed to end meeting: ${errorText}`);
      }
    } catch (error) {
      console.error("Error ending meeting:", error);
      throw error; // Re-throw to be handled by modal
    } finally {
      setIsEndingMeeting(null);
      setActiveMeetingId(null);
    }
  };

  // If no employeeId, show error
  if (!employeeId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No employee selected</p>
          <Button asChild>
            <Link to="/">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const startMeeting = async (meetingData: {
    clientName: string;
    reason: string;
    notes: string;
    leadId?: string;
    leadInfo?: {
      id: string;
      companyName: string;
      contactName: string;
    };
  }) => {
    if (!employee) return;

    setIsStartingMeeting(true);
    try {
      const response = await HttpClient.post("/api/meetings", {
        employeeId: employee.id,
        location: {
          lat: employee.location.lat,
          lng: employee.location.lng,
          address: employee.location.address,
        },
        clientName: meetingData.clientName,
        notes: `${meetingData.reason}${meetingData.notes ? ` - ${meetingData.notes}` : ""}`,
        leadId: meetingData.leadId,
        leadInfo: meetingData.leadInfo,
      });

      if (response.ok) {
        fetchMeetings();
        // Update employee status to meeting
        await HttpClient.put(`/api/employees/${employeeId}/status`, {
          status: "meeting",
        });
        fetchEmployee();
        setIsStartMeetingModalOpen(false);
      }
    } catch (error) {
      console.error("Error starting meeting:", error);
    } finally {
      setIsStartingMeeting(false);
    }
  };

  const openStartMeetingModal = () => {
    setIsStartMeetingModalOpen(true);
  };

  const handleTrackingSessionStart = (session: TrackingSession) => {
    setCurrentTrackingSession(session);
    console.log("Tracking session started:", session);
  };

  const handleTrackingSessionEnd = (session: TrackingSession) => {
    setCurrentTrackingSession(session);
    console.log("Tracking session ended:", session);
  };

  const getStatusColor = (status: Employee["status"]) => {
    switch (status) {
      case "active":
        return "bg-success text-success-foreground";
      case "meeting":
        return "bg-warning text-warning-foreground";
      case "inactive":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusText = (status: Employee["status"]) => {
    switch (status) {
      case "active":
        return "On Route";
      case "meeting":
        return "In Meeting";
      case "inactive":
        return "Offline";
      default:
        return "Unknown";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tracking data...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Employee not found</p>
          <Button asChild>
            <Link to="/">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" asChild>
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {employee.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Real-time Tracking
                </p>
              </div>
            </div>
            <Badge
              variant="secondary"
              className={`${getStatusColor(employee.status)}`}
            >
              {getStatusText(employee.status)}
            </Badge>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Employee Info */}
            <Card>
              <CardHeader>
                <CardTitle>Employee Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Name</span>
                    <span className="font-medium">{employee.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="font-medium">{employee.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Phone</span>
                    <span className="font-medium">{employee.phone}</span>
                  </div>
                  {employee.designation && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Designation
                      </span>
                      <span className="font-medium">
                        {employee.designation}
                      </span>
                    </div>
                  )}
                  {employee.department && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Department
                      </span>
                      <span className="font-medium">{employee.department}</span>
                    </div>
                  )}
                  {employee.companyName && (
                    <div className="flex items-start justify-between">
                      <span className="text-sm text-muted-foreground">
                        Company
                      </span>
                      <span className="font-medium text-right max-w-xs">
                        {employee.companyName}
                      </span>
                    </div>
                  )}
                  {employee.reportTo && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Reports To
                      </span>
                      <span className="font-medium">{employee.reportTo}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    <Badge
                      variant="secondary"
                      className={`${getStatusColor(employee.status)}`}
                    >
                      {getStatusText(employee.status)}
                    </Badge>
                  </div>
                  {employee.currentTask && (
                    <div className="flex items-start justify-between">
                      <span className="text-sm text-muted-foreground">
                        Current Task
                      </span>
                      <span className="font-medium text-right max-w-xs">
                        {employee.currentTask}
                      </span>
                    </div>
                  )}
                </div>

                {/* End Meeting Button - Shows when employee is in meeting */}
                {employee.status === "meeting" && (
                  <div className="pt-4 pb-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={handleEndMeetingAttempt}
                      disabled={isEndingMeeting !== null}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      {isEndingMeeting
                        ? "Ending Meeting..."
                        : "End Current Meeting"}
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCall(employee.phone)}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEmail(employee.email, employee.name)}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleSendMessage(employee.phone, employee.name)
                    }
                    className="col-span-2"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Current Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Current Location</span>
                  {employee.status === "meeting" ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleEndMeetingAttempt}
                      disabled={isEndingMeeting !== null}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      {isEndingMeeting ? "Ending..." : "End Meeting"}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openStartMeetingModal}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Start Meeting
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">{employee.location.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {employee.location.lat.toFixed(6)},{" "}
                      {employee.location.lng.toFixed(6)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      Last updated {employee.lastUpdate}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowMap(!showMap)}
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    {showMap ? "Hide Map" : "View on Map"}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      openInExternalMap(
                        employee.location.lat,
                        employee.location.lng,
                        employee.location.address,
                      )
                    }
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Open in Maps App
                  </Button>
                </div>

                {showMap && employee && (
                  <div className="mt-4">
                    <EmployeeMap
                      employees={[employee]}
                      height="300px"
                      trackingSession={currentTrackingSession}
                      showRoute={currentTrackingSession !== null}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Location Tracker */}
            <LocationTracker
              employeeId={employee.id}
              employeeName={employee.name}
              onLocationUpdate={handleLocationUpdate}
              trackingEnabled={employee.status === "active"}
              onTrackingSessionStart={handleTrackingSessionStart}
              onTrackingSessionEnd={handleTrackingSessionEnd}
            />

            {/* Recent Meetings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recent Meetings</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{meetings.length}</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsMeetingHistoryOpen(true)}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      History
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {meetings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No recent meetings
                  </p>
                ) : (
                  <div className="space-y-4">
                    {meetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        className={`border rounded-lg p-3 space-y-2 ${
                          meeting.status === "in-progress"
                            ? "border-warning bg-warning/5"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">
                            {meeting.clientName || "Unknown Client"}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant="secondary"
                              className={
                                meeting.status === "completed"
                                  ? "bg-success text-success-foreground"
                                  : meeting.status === "in-progress"
                                    ? "bg-warning text-warning-foreground"
                                    : "bg-info text-info-foreground"
                              }
                            >
                              {meeting.status}
                            </Badge>
                            {meeting.status === "in-progress" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleEndMeetingClick(meeting.id)
                                }
                                disabled={isEndingMeeting === meeting.id}
                              >
                                {isEndingMeeting === meeting.id
                                  ? "Ending..."
                                  : "End Meeting"}
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {meeting.location.address}
                        </p>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span className="font-medium">Started:</span>
                            <span className="ml-1">
                              {new Date(meeting.startTime).toLocaleString()}
                            </span>
                          </p>
                          {meeting.endTime && (
                            <p className="text-sm text-muted-foreground flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              <span className="font-medium">Ended:</span>
                              <span className="ml-1">
                                {new Date(meeting.endTime).toLocaleString()}
                              </span>
                            </p>
                          )}
                          {meeting.status === "in-progress" && (
                            <p className="text-sm text-success flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              <span className="font-medium">Duration:</span>
                              <span className="ml-1">
                                {Math.round(
                                  (Date.now() -
                                    new Date(meeting.startTime).getTime()) /
                                    (1000 * 60),
                                )}{" "}
                                minutes
                              </span>
                            </p>
                          )}
                          {meeting.endTime &&
                            meeting.status === "completed" && (
                              <p className="text-sm text-info flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                <span className="font-medium">Duration:</span>
                                <span className="ml-1">
                                  {Math.round(
                                    (new Date(meeting.endTime).getTime() -
                                      new Date(meeting.startTime).getTime()) /
                                      (1000 * 60),
                                  )}{" "}
                                  minutes
                                </span>
                              </p>
                            )}
                        </div>
                        {meeting.notes && (
                          <p className="text-sm">{meeting.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Start Meeting Modal */}
      {employee && (
        <StartMeetingModal
          isOpen={isStartMeetingModalOpen}
          onClose={() => setIsStartMeetingModalOpen(false)}
          onStartMeeting={startMeeting}
          employeeName={employee.name}
          location={employee.location.address}
          isLoading={isStartingMeeting}
        />
      )}

      {/* End Meeting Modal */}
      {employee && (
        <EndMeetingModal
          isOpen={isEndMeetingModalOpen}
          onClose={() => {
            setIsEndMeetingModalOpen(false);
            setActiveMeetingId(null);
          }}
          onEndMeeting={handleEndMeetingWithDetails}
          employeeName={employee.name}
          isLoading={isEndingMeeting !== null}
        />
      )}

      {/* Meeting History Modal */}
      <MeetingHistory
        employeeId={employeeId}
        isOpen={isMeetingHistoryOpen}
        onClose={() => setIsMeetingHistoryOpen(false)}
      />
    </div>
  );
}
