import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Users,
  Navigation,
  Clock,
  Phone,
  MessageSquare,
  MoreVertical,
  RefreshCw,
  Mail,
  AlertCircle,
  X,
  Calendar,
  BarChart3,
  LogOut,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Employee, EmployeesResponse } from "@shared/api";
import { EmployeeMap } from "@/components/EmployeeMap";
import { MeetingHistory } from "@/components/MeetingHistory";
import { PWAInstallPrompt, usePWAInstall } from "@/components/PWAInstallPrompt";
import { HttpClient } from "@/lib/httpClient";
import { TodaysMeetings, FollowUpMeeting, getPendingTodaysMeetings } from "@/components/TodaysMeetings";
import { StartMeetingModal } from "@/components/StartMeetingModal";
import { PendingMeetingsModal } from "@/components/PendingMeetingsModal";
import { toast } from "@/hooks/use-toast";

export default function Index() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);
  const [isMeetingHistoryOpen, setIsMeetingHistoryOpen] = useState(false);
  
  const [todaysMeetings, setTodaysMeetings] = useState<FollowUpMeeting[]>([]);
  const [isStartMeetingModalOpen, setIsStartMeetingModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<FollowUpMeeting | null>(null);
  const [isPendingMeetingsModalOpen, setIsPendingMeetingsModalOpen] = useState(false);
  const [isStartingMeeting, setIsStartingMeeting] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<any>(null);

  // PWA install functionality
  const { canInstall, isInstalled } = usePWAInstall();

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      } catch (error) {
        console.error("Failed to parse user from localStorage:", error);
      }
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    // Set up auto-refresh every 60 seconds (reduced from 30s)
    const interval = setInterval(fetchEmployees, 60000);
    return () => clearInterval(interval);
  }, []);

  // const fetchEmployees = async () => {
  //   try {
  //     console.log("Fetching employees");

  //     const response = await HttpClient.get("/api/employees");

  //     if (response.ok) {
  //       const data: EmployeesResponse = await response.json();
  //       setEmployees(data.employees);
  //       setLastRefresh(new Date());
  //       console.log("Employees data fetched successfully:", data);
  //     } else {
  //       // Don't try to read response body on error as it might cause "body stream already read" error
  //       console.error(
  //         `Failed to fetch employees: ${response.status} ${response.statusText}`,
  //       );
  //       setEmployees([]);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching employees:", error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const fetchEmployees = async () => {
    try {
      console.log("Fetching employees");

      const response = await HttpClient.get("/api/employees");

      if (response.ok) {
        const data: EmployeesResponse = await response.json();
        setEmployees(data.employees || []);
        setLastRefresh(new Date());
        console.log(
          "Employees data fetched successfully:",
          data.employees?.length || 0,
        );
      } else {
        console.error(
          `Failed to fetch employees: ${response.status} ${response.statusText}`,
        );
        setEmployees([]);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchEmployees();
  };

  const handleRefreshLocations = async () => {
    try {
      setLoading(true);
      console.log("Refreshing employee locations with Indian cities");

      const response = await HttpClient.post(
        "/api/employees/refresh-locations",
      );

      if (response.ok) {
        const result = await response.json();
        console.log("Locations refreshed successfully:", result);
        // Refresh the employee list to show new locations
        await fetchEmployees();
        setShowLocationPrompt(false); // Hide the prompt after refreshing
      } else {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error(
          "Failed to refresh locations:",
          response.status,
          errorText,
        );
        alert("Failed to refresh locations. Please try again.");
      }
    } catch (error) {
      console.error("Error refreshing locations:", error);
      alert(
        "Error refreshing locations. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
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

  const handleStartMeetingFromSchedule = (meeting: FollowUpMeeting) => {
    setSelectedMeeting(meeting);
    setIsStartMeetingModalOpen(true);
  };

  const handleStartMeeting = async (meetingData: {
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
    const firstActiveEmployee = employees.find(
      (emp) => emp.status === "active" || emp.status === "meeting"
    ) || employees[0];

    if (!firstActiveEmployee) {
      toast({
        title: "Error",
        description: "No active employee found to start meeting",
        variant: "destructive",
      });
      return;
    }

    setIsStartingMeeting(true);
    try {
      const response = await HttpClient.post("/api/meetings", {
        employeeId: firstActiveEmployee.id,
        location: {
          lat: firstActiveEmployee.location.lat,
          lng: firstActiveEmployee.location.lng,
          address: firstActiveEmployee.location.address,
        },
        clientName: meetingData.clientName,
        notes: `${meetingData.reason}${meetingData.notes ? ` - ${meetingData.notes}` : ""}`,
        leadId: meetingData.leadId,
        leadInfo: meetingData.leadInfo,
      });

      if (response.ok) {
        await HttpClient.put(`/api/employees/${firstActiveEmployee.id}/status`, {
          status: "meeting",
        });
        fetchEmployees();
        setIsStartMeetingModalOpen(false);
        setSelectedMeeting(null);
        
        toast({
          title: "Meeting Started",
          description: `Meeting with ${meetingData.clientName} has been started successfully`,
        });
      }
    } catch (error) {
      console.error("Error starting meeting:", error);
      toast({
        title: "Error",
        description: "Failed to start meeting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsStartingMeeting(false);
    }
  };

  const handleLogout = () => {
    if (!currentUser?._id) {
      performLogout();
      return;
    }

    const pendingMeetings = getPendingTodaysMeetings(todaysMeetings);
    
    if (pendingMeetings.length > 0) {
      setIsPendingMeetingsModalOpen(true);
    } else {
      performLogout();
    }
  };

  const handlePendingMeetingsSubmit = (reason: string) => {
    console.log("Pending meetings reason:", reason);
    console.log("Pending meetings:", getPendingTodaysMeetings(todaysMeetings));
    
    toast({
      title: "Reason Recorded",
      description: "Your reason for pending meetings has been saved.",
    });
    
    setIsPendingMeetingsModalOpen(false);
    performLogout();
  };

  const performLogout = () => {
    localStorage.removeItem("idToken");
    localStorage.removeItem("user");
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully.",
    });
    window.location.href = "/";
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

  const activeEmployees = employees.filter(
    (emp) => emp.status === "active" || emp.status === "meeting",
  );
  console.log("employee list", activeEmployees);
  const totalEmployees = employees.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between overflow-auto">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  FieldTracker
                </h1>
                <p className="text-sm text-muted-foreground">
                  Employee Location Management
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/team-management">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Team
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMeetingHistoryOpen(true)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Meeting History
              </Button>
              <Button size="sm" asChild disabled={employees.length === 0}>
                <Link
                  to={`/tracking/${selectedEmployee || (employees.length > 0 ? employees[0].id : "1")}`}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  {selectedEmployee ? "View Selected" : "Live View"}
                </Link>
              </Button>
              {currentUser && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Last Refresh Info */}
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
            {loading && " • Refreshing..."}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Employees
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {activeEmployees.length}
              </div>
              <p className="text-xs text-muted-foreground">
                of {totalEmployees} total employees
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Meetings</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {employees.filter((emp) => emp.status === "meeting").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently with clients
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On Route</CardTitle>
              <Navigation className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {employees.filter((emp) => emp.status === "active").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Moving to locations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Update</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-info">1m</div>
              <p className="text-xs text-muted-foreground">Avg response time</p>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {loading && employees.length === 0 && (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading employee data...</p>
          </div>
        )}

        {/* PWA Install Prompt */}
        {canInstall && !isInstalled && (
          <div className="mb-6">
            <PWAInstallPrompt
              onInstall={() => console.log("PWA installed")}
              onDismiss={() => console.log("PWA install dismissed")}
            />
          </div>
        )}

        {/* Location Update Prompt */}
        {showLocationPrompt && employees.length > 0 && (
          <Card className="border-info bg-info/5">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between overflow-auto">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-info mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-info mb-1">
                      Update Your Real Location
                    </h4>
                    <p className="text-sm text-info/80 mb-3">
                      We've detected your team is in India. Click on any
                      employee's "Live View" and use the "Start Tracking" button
                      to update their real location for accurate tracking.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-info text-info hover:bg-info hover:text-white"
                        onClick={() => {
                          const firstEmployee = employees[0];
                          if (firstEmployee) {
                            window.open(
                              `/tracking/${firstEmployee.id}`,
                              "_blank",
                            );
                          }
                        }}
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        Enable Live Tracking
                      </Button>
                      <Button
                        size="sm"
                        className="bg-info hover:bg-info/90 text-white"
                        onClick={handleRefreshLocations}
                        disabled={loading}
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Update to Indian Cities
                      </Button>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLocationPrompt(false)}
                  className="text-info hover:text-info"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Data State */}
        {!loading && employees.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No employees found</h3>
            <p className="text-muted-foreground">
              Add employees to start tracking their locations.
            </p>
          </div>
        )}

        {/* Today's Meetings Section */}
        {!loading && currentUser?._id && (
          <div className="mb-8">
            <TodaysMeetings 
              userId={currentUser._id}
              onStartMeeting={handleStartMeetingFromSchedule}
              onMeetingsFetched={setTodaysMeetings}
            />
          </div>
        )}

        {/* Main Content Grid */}
        {!loading && employees.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Employee List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between ">
                    <span>Field Team</span>
                    <Badge variant="secondary">{employees.length} total</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                  <div className="space-y-0">
                    {employees.map((employee) => (
                      <div
                        key={employee.id}
                        className={`p-4 border-b last:border-b-0 cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedEmployee === employee.id
                            ? "bg-primary/5 border-l-4 border-l-primary"
                            : ""
                        }`}
                        onClick={() => setSelectedEmployee(employee.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium text-foreground">
                                {employee.name}
                              </h4>
                              <Badge
                                variant="secondary"
                                className={`text-xs ${getStatusColor(employee.status)}`}
                              >
                                {getStatusText(employee.status)}
                              </Badge>
                            </div>
                            {employee.designation && (
                              <p className="text-xs text-muted-foreground mb-1">
                                {employee.designation}
                                {employee.department &&
                                  ` • ${employee.department}`}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mb-1">
                              <MapPin className="h-3 w-3 inline mr-1" />
                              {employee.location.address}
                            </p>
                            {employee.currentTask && (
                              <p className="text-xs text-primary font-medium mb-1">
                                {employee.currentTask}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 inline mr-1" />
                              Updated {employee.lastUpdate}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCall(employee.phone);
                              }}
                              title="Call employee"
                            >
                              <Phone className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEmail(employee.email, employee.name);
                              }}
                              title="Send email"
                            >
                              <Mail className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              asChild
                              title="Track employee"
                            >
                              <Link
                                to={`/tracking/${employee.id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Navigation className="h-3 w-3" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Map Area */}
            <div className="lg:col-span-2">
              <Card className="h-[600px]">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Live Location Map</span>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedEmployee) {
                            // Map will auto-center via useEffect when selectedEmployee changes
                            return;
                          }
                          // Reset selection to fit all employees
                          setSelectedEmployee(null);
                        }}
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        {selectedEmployee ? "Center on Selected" : "Fit All"}
                      </Button>
                      <div className="h-2 w-2 rounded-full bg-success animate-pulse"></div>
                      <span className="text-sm text-muted-foreground">
                        Live
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <EmployeeMap
                    employees={employees}
                    selectedEmployee={selectedEmployee}
                    height="500px"
                    onEmployeeClick={setSelectedEmployee}
                  />
                  <div className="flex items-center justify-center space-x-4 text-sm mt-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 rounded-full bg-success"></div>
                      <span>On Route</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 rounded-full bg-warning"></div>
                      <span>In Meeting</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 rounded-full bg-muted"></div>
                      <span>Offline</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {!loading && employees.length > 0 && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {employees
                    .filter((emp) => emp.status !== "inactive")
                    .slice(0, 3)
                    .map((employee, index) => (
                      <div
                        key={employee.id}
                        className="flex items-start space-x-3"
                      >
                        <div
                          className={`h-2 w-2 rounded-full mt-2 ${
                            employee.status === "active"
                              ? "bg-success"
                              : employee.status === "meeting"
                                ? "bg-warning"
                                : "bg-info"
                          }`}
                        ></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {employee.name}{" "}
                            {employee.status === "active"
                              ? "is on route"
                              : employee.status === "meeting"
                                ? "started meeting"
                                : "updated location"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {employee.location.address} • {employee.lastUpdate}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Meeting History Modal */}
      <MeetingHistory
        isOpen={isMeetingHistoryOpen}
        onClose={() => setIsMeetingHistoryOpen(false)}
      />

      {/* Start Meeting Modal */}
      <StartMeetingModal
        isOpen={isStartMeetingModalOpen}
        onClose={() => {
          setIsStartMeetingModalOpen(false);
          setSelectedMeeting(null);
        }}
        onStartMeeting={handleStartMeeting}
        employeeName={employees[0]?.name || "Employee"}
        location={employees[0]?.location.address || "Unknown location"}
        isLoading={isStartingMeeting}
        initialClientName={selectedMeeting?.customerName || ""}
        initialCompanyName={selectedMeeting?.companyName || ""}
        initialReason={selectedMeeting?.type || ""}
        initialNotes={selectedMeeting?.remark || ""}
      />

      {/* Pending Meetings Modal */}
      <PendingMeetingsModal
        isOpen={isPendingMeetingsModalOpen}
        onClose={() => setIsPendingMeetingsModalOpen(false)}
        onSubmit={handlePendingMeetingsSubmit}
        pendingMeetings={getPendingTodaysMeetings(todaysMeetings)}
      />
    </div>
  );
}
