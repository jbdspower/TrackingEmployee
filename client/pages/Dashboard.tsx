import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  Filter,
  Download,
  BarChart3,
  Users,
  TrendingUp,
  Search,
  CalendarDays,
  Eye,
  ArrowLeft,
  History,
  Save,
  Edit,
} from "lucide-react";
import { HttpClient } from "@/lib/httpClient";
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";

interface EmployeeAnalytics {
  employeeId: string;
  employeeName: string;
  totalMeetings: number;
  todayMeetings: number;
  totalMeetingHours: number;
  totalDutyHours: number;
  status: "active" | "inactive" | "meeting";
}

interface EmployeeDayRecord {
  date: string;
  totalMeetings: number;
  startLocationTime: string;
  startLocationAddress: string;
  outLocationTime: string;
  outLocationAddress: string;
  totalDutyHours: number;
  meetingTime: number;
  travelAndLunchTime: number;
  attendanceStatus?: string;
  attendanceReason?: string;
}

interface EmployeeMeetingRecord {
  employeeName: string;
  companyName: string;
  date: string;
  leadId?: string;
  meetingInTime: string;
  meetingInLocation: string;
  meetingOutTime: string;
  meetingOutLocation: string;
  totalStayTime: number;
  discussion: string;
  meetingPerson: string;
}

interface DashboardFilters {
  employeeId: string;
  dateRange: "all" | "today" | "yesterday" | "week" | "month" | "custom";
  startDate?: string;
  endDate?: string;
  searchTerm: string;
}

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<EmployeeAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DashboardFilters>({
    employeeId: "all",
    dateRange: "all",
    searchTerm: "",
  });

  // Detailed employee view state
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [employeeDayRecords, setEmployeeDayRecords] = useState<
    EmployeeDayRecord[]
  >([]);
  const [employeeMeetingRecords, setEmployeeMeetingRecords] = useState<
    EmployeeMeetingRecord[]
  >([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Meeting history modal state
  const [meetingHistoryModal, setMeetingHistoryModal] = useState<{
    isOpen: boolean;
    employeeId: string;
    employeeName: string;
    meetingHistory: any[];
    loading: boolean;
  }>({
    isOpen: false,
    employeeId: "",
    employeeName: "",
    meetingHistory: [],
    loading: false,
  });

  // Attendance editing state
  const [attendanceEdits, setAttendanceEdits] = useState<Record<string, {
    attendanceStatus: string;
    attendanceReason: string;
    isEditing: boolean;
    isSaving: boolean;
  }>>({});

  // Summary statistics
  const [summaryStats, setSummaryStats] = useState({
    totalEmployees: 0,
    activeMeetings: 0,
    totalMeetingsToday: 0,
    avgMeetingDuration: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, [filters]);

  // Re-fetch employee details when filters change while in detail view
  useEffect(() => {
    if (selectedEmployee) {
      handleEmployeeClick(selectedEmployee, analytics.find(emp => emp.employeeId === selectedEmployee)?.employeeName || "Unknown");
    }
  }, [filters.dateRange, filters.startDate, filters.endDate]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (filters.employeeId !== "all") {
        queryParams.append("employeeId", filters.employeeId);
      }
      queryParams.append("dateRange", filters.dateRange);
      if (filters.startDate) queryParams.append("startDate", filters.startDate);
      if (filters.endDate) queryParams.append("endDate", filters.endDate);
      if (filters.searchTerm) queryParams.append("search", filters.searchTerm);

      const response = await HttpClient.get(
        `/api/analytics/employees?${queryParams}`,
      );

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics || []);
        setSummaryStats(
          data.summary || {
            totalEmployees: 0,
            activeMeetings: 0,
            totalMeetingsToday: 0,
            avgMeetingDuration: 0,
          },
        );
      } else {
        console.error("Failed to fetch analytics");
        setAnalytics([]);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof DashboardFilters, value: string) => {
    setFilters((prev) => {
      const newFilters = {
        ...prev,
        [key]: value,
      };

      // Clear custom date fields when switching away from custom range
      if (key === "dateRange" && value !== "custom") {
        newFilters.startDate = undefined;
        newFilters.endDate = undefined;
      }

      // Auto-set end date to today if only start date is set
      if (key === "startDate" && value && !prev.endDate) {
        newFilters.endDate = format(new Date(), "yyyy-MM-dd");
      }

      return newFilters;
    });
  };

  const handleClearCustomDates = () => {
    setFilters((prev) => ({
      ...prev,
      startDate: undefined,
      endDate: undefined,
    }));
  };

  const handleQuickDateRange = (range: string) => {
    const today = new Date();
    let startDate: string;
    let endDate: string = format(today, "yyyy-MM-dd");

    switch (range) {
      case "last7":
        startDate = format(subDays(today, 6), "yyyy-MM-dd");
        break;
      case "last30":
        startDate = format(subDays(today, 29), "yyyy-MM-dd");
        break;
      case "lastMonth":
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        startDate = format(lastMonth, "yyyy-MM-dd");
        endDate = format(lastMonthEnd, "yyyy-MM-dd");
        break;
      case "thisMonth":
        startDate = format(startOfMonth(today), "yyyy-MM-dd");
        endDate = format(endOfMonth(today), "yyyy-MM-dd");
        break;
      default:
        return;
    }

    setFilters((prev) => ({
      ...prev,
      dateRange: "custom",
      startDate,
      endDate,
    }));
  };

  const getDateRangeText = () => {
    switch (filters.dateRange) {
      case "all":
        return "All Time";
      case "today":
        return "Today";
      case "yesterday":
        return "Yesterday";
      case "week":
        return "This Week";
      case "month":
        return "This Month";
      case "custom":
        if (filters.startDate && filters.endDate) {
          const start = new Date(filters.startDate);
          const end = new Date(filters.endDate);
          const startYear = start.getFullYear();
          const endYear = end.getFullYear();
          const currentYear = new Date().getFullYear();

          if (startYear === endYear && startYear === currentYear) {
            return `${format(start, "MMM dd")} - ${format(end, "MMM dd")}`;
          } else if (startYear === endYear) {
            return `${format(start, "MMM dd")} - ${format(end, "MMM dd, yyyy")}`;
          } else {
            return `${format(start, "MMM dd, yyyy")} - ${format(end, "MMM dd, yyyy")}`;
          }
        }
        return "Custom Range";
      default:
        return "Today";
    }
  };

  const exportData = () => {
    const csvContent = [
      [
        "Employee Name",
        "Total Meetings",
        "Today's Meetings",
        "Meeting Hours",
        "Duty Hours",
      ],
      ...analytics.map((emp) => [
        emp.employeeName,
        emp.totalMeetings.toString(),
        emp.todayMeetings.toString(),
        `${emp.totalMeetingHours.toFixed(1)}h`,
        `${emp.totalDutyHours.toFixed(1)}h`,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employee-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleEmployeeClick = async (
    employeeId: string,
    employeeName: string,
  ) => {
    setSelectedEmployee(employeeId);
    setLoadingDetails(true);
    try {
      // Fetch detailed employee data
      const response = await HttpClient.get(
        `/api/analytics/employee-details/${employeeId}?${new URLSearchParams({
          dateRange: filters.dateRange,
          ...(filters.startDate && { startDate: filters.startDate }),
          ...(filters.endDate && { endDate: filters.endDate }),
        })}`,
      );

      if (response.ok) {
        const data = await response.json();
        setEmployeeDayRecords(data.dayRecords || []);
        setEmployeeMeetingRecords(data.meetingRecords || []);
      } else {
        console.error("Failed to fetch employee details");
        setEmployeeDayRecords([]);
        setEmployeeMeetingRecords([]);
      }
    } catch (error) {
      console.error("Error fetching employee details:", error);
      setEmployeeDayRecords([]);
      setEmployeeMeetingRecords([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBackToList = () => {
    setSelectedEmployee(null);
    setEmployeeDayRecords([]);
    setEmployeeMeetingRecords([]);
  };

  // Generate color for date
  const getDateColor = (date: string, index: number) => {
    const colors = [
      "bg-blue-50 border-blue-200 text-blue-900",
      "bg-green-50 border-green-200 text-green-900",
      "bg-purple-50 border-purple-200 text-purple-900",
      "bg-orange-50 border-orange-200 text-orange-900",
      "bg-pink-50 border-pink-200 text-pink-900",
      "bg-indigo-50 border-indigo-200 text-indigo-900",
    ];
    return colors[index % colors.length];
  };

  // Handle meeting history viewing
  const handleViewMeetingHistory = async (employeeId: string, leadId?: string) => {
    if (!employeeId) {
      console.error("No employee ID provided for meeting history");
      return;
    }

    // Find employee name from analytics or use the selected employee info
    const employeeName = analytics.find(emp => emp.employeeId === employeeId)?.employeeName ||
                        (selectedEmployee === employeeId ? "Selected Employee" : "Unknown Employee");

    const contextInfo = leadId ? `employee: ${employeeId} (${employeeName}), leadId: ${leadId}` : `employee: ${employeeId} (${employeeName})`;
    console.log(`Opening meeting history for ${contextInfo}`);

    // Ensure we always start with fresh data for this employee/lead combination
    setMeetingHistoryModal({
      isOpen: true,
      employeeId,
      employeeName: leadId ? `${employeeName} - Lead ${leadId}` : employeeName,
      meetingHistory: [], // Always clear previous data
      loading: true,
    });

    try {
      // Build query parameters including date filters
      const queryParams = new URLSearchParams();
      queryParams.append("employeeId", employeeId);
      queryParams.append("limit", "50");
      queryParams.append("_t", Date.now().toString()); // Cache busting parameter

      // Add leadId filter if provided (for specific meeting history)
      if (leadId) {
        queryParams.append("leadId", leadId);
      }

      // For meeting history:
      // - If "all" filter, show ALL meetings (no date filter)
      // - For other specific filters, apply the date filter
      const shouldApplyDateFilter = filters.dateRange !== "all";

      if (shouldApplyDateFilter) {
        queryParams.append("dateRange", filters.dateRange);
        if (filters.startDate) queryParams.append("startDate", filters.startDate);
        if (filters.endDate) queryParams.append("endDate", filters.endDate);
        console.log(`Applying date filter to meeting history for ${employeeName}:`, filters.dateRange);
      } else {
        console.log(`Showing ALL meetings in history for ${employeeName} (All Time filter selected)`);
      }

      console.log(`Fetching meeting history for ${employeeName} with filters: ${queryParams.toString()}`);

      const response = await HttpClient.get(`/api/meeting-history?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`Meeting history response for ${employeeName}: ${data.meetings?.length || 0} records`);

        // Validate that the response is for the correct employee
        const meetings = data.meetings || [];
        const incorrectMeetings = meetings.filter(m => m.employeeId !== employeeId);
        if (incorrectMeetings.length > 0) {
          console.error(`WARNING: Found ${incorrectMeetings.length} meetings that don't belong to employee ${employeeId}:`,
            incorrectMeetings.map(m => ({ meetingEmployeeId: m.employeeId, leadId: m.leadId })));
        }

        // Only show meetings that actually belong to this employee
        const filteredMeetings = meetings.filter(m => m.employeeId === employeeId);
        console.log(`After filtering: ${filteredMeetings.length} meetings actually belong to ${employeeName}`);

        setMeetingHistoryModal(prev => ({
          ...prev,
          meetingHistory: filteredMeetings,
          loading: false,
        }));
      } else {
        console.error(`Failed to fetch meeting history for ${employeeName}`);
        setMeetingHistoryModal(prev => ({
          ...prev,
          meetingHistory: [],
          loading: false,
        }));
      }
    } catch (error) {
      console.error(`Error fetching meeting history for ${employeeName}:`, error);
      setMeetingHistoryModal(prev => ({
        ...prev,
        meetingHistory: [],
        loading: false,
      }));
    }
  };

  const closeMeetingHistoryModal = () => {
    console.log("Closing meeting history modal");
    setMeetingHistoryModal({
      isOpen: false,
      employeeId: "",
      employeeName: "",
      meetingHistory: [],
      loading: false,
    });
  };

  // Attendance management functions
  const attendanceOptions = [
    { value: "full_day", label: "Full Day" },
    { value: "half_day", label: "Half Day" },
    { value: "off", label: "Off" },
    { value: "short_leave", label: "Short Leave" },
    { value: "ot", label: "OT" },
  ];

  const handleEditAttendance = (date: string, currentStatus?: string, currentReason?: string) => {
    setAttendanceEdits(prev => ({
      ...prev,
      [date]: {
        attendanceStatus: currentStatus || "full_day",
        attendanceReason: currentReason || "",
        isEditing: true,
        isSaving: false,
      }
    }));
  };

  const handleCancelAttendanceEdit = (date: string) => {
    setAttendanceEdits(prev => {
      const newEdits = { ...prev };
      delete newEdits[date];
      return newEdits;
    });
  };

  const handleAttendanceStatusChange = (date: string, status: string) => {
    setAttendanceEdits(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        attendanceStatus: status,
      }
    }));
  };

  const handleAttendanceReasonChange = (date: string, reason: string) => {
    setAttendanceEdits(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        attendanceReason: reason,
      }
    }));
  };

  const handleSaveAttendance = async (date: string) => {
    const editData = attendanceEdits[date];
    if (!editData || !selectedEmployee) return;

    setAttendanceEdits(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        isSaving: true,
      }
    }));

    try {
      const response = await HttpClient.post('/api/analytics/save-attendance', {
        employeeId: selectedEmployee,
        date,
        attendanceStatus: editData.attendanceStatus,
        attendanceReason: editData.attendanceReason,
      });

      if (response.ok) {
        // Update the day record
        setEmployeeDayRecords(prev => prev.map(record =>
          record.date === date
            ? {
                ...record,
                attendanceStatus: editData.attendanceStatus,
                attendanceReason: editData.attendanceReason,
              }
            : record
        ));

        // Clear the editing state
        handleCancelAttendanceEdit(date);

        console.log("Attendance saved successfully");
      } else {
        console.error("Failed to save attendance");
        alert("Failed to save attendance. Please try again.");
      }
    } catch (error) {
      console.error("Error saving attendance:", error);
      alert("Error saving attendance. Please try again.");
    } finally {
      setAttendanceEdits(prev => ({
        ...prev,
        [date]: {
          ...prev[date],
          isSaving: false,
        }
      }));
    }
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-success text-success-foreground">Active</Badge>
        );
      case "meeting":
        return (
          <Badge className="bg-warning text-warning-foreground">
            In Meeting
          </Badge>
        );
      case "inactive":
        return <Badge variant="secondary">Offline</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Analytics Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Employee performance and meeting analytics for{" "}
                {getDateRangeText()}
              </p>
            </div>
            <Button onClick={exportData} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Employees
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryStats.totalEmployees}
              </div>
              <p className="text-xs text-muted-foreground">Active in system</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Meetings
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {summaryStats.activeMeetings}
              </div>
              <p className="text-xs text-muted-foreground">Currently ongoing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Meetings {getDateRangeText()}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {summaryStats.totalMeetingsToday}
              </div>
              <p className="text-xs text-muted-foreground">
                Completed meetings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Meeting Duration
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-info">
                {summaryStats.avgMeetingDuration.toFixed(1)}h
              </div>
              <p className="text-xs text-muted-foreground">Per meeting</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </div>
              {filters.dateRange === "custom" && filters.startDate && filters.endDate && (
                <Badge variant="secondary" className="text-xs">
                  Custom: {format(new Date(filters.startDate), "MMM dd")} - {format(new Date(filters.endDate), "MMM dd")}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search Employee</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name..."
                    value={filters.searchTerm}
                    onChange={(e) =>
                      handleFilterChange("searchTerm", e.target.value)
                    }
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Employee Filter */}
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select
                  value={filters.employeeId}
                  onValueChange={(value) =>
                    handleFilterChange("employeeId", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {analytics.map((emp) => (
                      <SelectItem key={emp.employeeId} value={emp.employeeId}>
                        {emp.employeeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select
                  value={filters.dateRange}
                  onValueChange={(value) =>
                    handleFilterChange("dateRange", value as any)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range Inputs */}
              {filters.dateRange === "custom" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={filters.startDate || ""}
                      onChange={(e) =>
                        handleFilterChange("startDate", e.target.value)
                      }
                      max={filters.endDate || format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={filters.endDate || ""}
                      onChange={(e) =>
                        handleFilterChange("endDate", e.target.value)
                      }
                      min={filters.startDate || ""}
                      max={format(new Date(), "yyyy-MM-dd")}
                    />
                    {filters.dateRange === "custom" && (!filters.startDate || !filters.endDate) && (
                      <p className="text-xs text-amber-600">
                        Please select both start and end dates
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Quick Date Range Presets */}
              {filters.dateRange === "custom" && (
                <div className="space-y-2 md:col-span-2 lg:col-span-2 xl:col-span-2">
                  <Label>Quick Select</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickDateRange("last7")}
                      className="text-xs"
                    >
                      Last 7 Days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickDateRange("last30")}
                      className="text-xs"
                    >
                      Last 30 Days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickDateRange("thisMonth")}
                      className="text-xs"
                    >
                      This Month
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickDateRange("lastMonth")}
                      className="text-xs"
                    >
                      Last Month
                    </Button>
                  </div>
                </div>
              )}

              {/* Apply Filter Button */}
              <div className="space-y-2 md:col-span-2 lg:col-span-1 xl:col-span-1">
                <Label>&nbsp;</Label>
                <div className="flex space-x-2">
                  <Button
                    onClick={fetchAnalytics}
                    className="flex-1"
                    disabled={loading || (filters.dateRange === "custom" && (!filters.startDate || !filters.endDate))}
                  >
                    <CalendarDays className="h-4 w-4 mr-2" />
                    {loading ? "Loading..." : "Apply Filter"}
                  </Button>
                  {filters.dateRange === "custom" && (
                    <Button
                      variant="outline"
                      onClick={handleClearCustomDates}
                      disabled={loading}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conditional Content: Analytics Table or Employee Details */}
        {!selectedEmployee ? (
          /* Main Analytics Table */
          <Card>
            <CardHeader>
              <CardTitle>Employee Analytics</CardTitle>
              <p className="text-sm text-muted-foreground">
                Detailed breakdown of employee performance and meeting
                statistics
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading analytics...</p>
                </div>
              ) : analytics.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No data available for the selected filters
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">
                          Total Meetings
                        </TableHead>
                        <TableHead className="text-center">
                          Today's Meetings
                        </TableHead>
                        <TableHead className="text-center">
                          Meeting Hours
                        </TableHead>
                        <TableHead className="text-center">
                          Duty Hours
                        </TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.map((employee) => (
                        <TableRow key={employee.employeeId}>
                          <TableCell className="font-medium">
                            {employee.employeeName}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(employee.status)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">
                              {employee.totalMeetings}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={
                                employee.todayMeetings > 0
                                  ? "bg-success/10 text-success border-success"
                                  : ""
                              }
                            >
                              {employee.todayMeetings}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span>
                                {formatHours(employee.totalMeetingHours)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span>
                                {formatHours(employee.totalDutyHours)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleEmployeeClick(
                                  employee.employeeId,
                                  employee.employeeName,
                                )
                              }
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Employee Details View */
          <div className="space-y-6">
            {/* Back Button */}
            <Card>
              <CardContent className="pt-6">
                <Button onClick={handleBackToList} variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Employee List
                </Button>
              </CardContent>
            </Card>

            {/* Employee Details Tables */}
            {loadingDetails ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">
                      Loading employee details...
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Group records by date and render with colors */}
                {(() => {
                  const uniqueDates = Array.from(
                    new Set([
                      ...employeeDayRecords.map((r) => r.date),
                      ...employeeMeetingRecords.map((r) => r.date),
                    ]),
                  ).sort(
                    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
                  );

                  return uniqueDates.map((date, dateIndex) => {
                    const dayRecord = employeeDayRecords.find(
                      (r) => r.date === date,
                    );
                    const meetingRecordsForDate = employeeMeetingRecords.filter(
                      (r) => r.date === date,
                    );
                    const colorClass = getDateColor(date, dateIndex);

                    return (
                      <div
                        key={date}
                        className={`p-4 rounded-lg border-2 ${colorClass}`}
                      >
                        <h3 className="text-lg font-semibold mb-4">
                          {format(new Date(date), "EEEE, MMMM dd, yyyy")}
                        </h3>

                        {/* Daily Summary Table */}
                        {dayRecord && (
                          <Card className="mb-4">
                            <CardHeader>
                              <CardTitle className="text-sm">
                                Daily Summary
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow className={colorClass}>
                                      <TableHead>Date</TableHead>
                                      <TableHead>Total Meetings</TableHead>
                                      <TableHead>Start Location Time</TableHead>
                                      <TableHead>
                                        Start Location Address
                                      </TableHead>
                                      <TableHead>Out Location Time</TableHead>
                                      <TableHead>
                                        Out Location Address
                                      </TableHead>
                                      <TableHead>Total Duty Hours</TableHead>
                                      <TableHead>Meeting Time</TableHead>
                                      <TableHead>Travel & Lunch Time</TableHead>
                                      <TableHead>Attendance Status</TableHead>
                                      <TableHead>Reason</TableHead>
                                      <TableHead>Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    <TableRow
                                      className={`${colorClass} opacity-80`}
                                    >
                                      <TableCell>
                                        {format(
                                          new Date(dayRecord.date),
                                          "MM/dd/yyyy",
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {dayRecord.totalMeetings}
                                      </TableCell>
                                      <TableCell>
                                        {dayRecord.startLocationTime
                                          ? format(
                                              new Date(
                                                dayRecord.startLocationTime,
                                              ),
                                              "HH:mm",
                                            )
                                          : "-"}
                                      </TableCell>
                                      <TableCell>
                                        {dayRecord.startLocationAddress || "-"}
                                      </TableCell>
                                      <TableCell>
                                        {dayRecord.outLocationTime
                                          ? format(
                                              new Date(
                                                dayRecord.outLocationTime,
                                              ),
                                              "HH:mm",
                                            )
                                          : "-"}
                                      </TableCell>
                                      <TableCell>
                                        {dayRecord.outLocationAddress || "-"}
                                      </TableCell>
                                      <TableCell>
                                        {formatHours(dayRecord.totalDutyHours)}
                                      </TableCell>
                                      <TableCell>
                                        {formatHours(dayRecord.meetingTime)}
                                      </TableCell>
                                      <TableCell>
                                        {formatHours(
                                          dayRecord.travelAndLunchTime,
                                        )}
                                      </TableCell>

                                      {/* Attendance Status */}
                                      <TableCell>
                                        {attendanceEdits[date]?.isEditing ? (
                                          <Select
                                            value={attendanceEdits[date].attendanceStatus}
                                            onValueChange={(value) => handleAttendanceStatusChange(date, value)}
                                          >
                                            <SelectTrigger className="w-32">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {attendanceOptions.map(option => (
                                                <SelectItem key={option.value} value={option.value}>
                                                  {option.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <div className="flex items-center space-x-2">
                                            <span className="text-sm">
                                              {dayRecord.attendanceStatus
                                                ? attendanceOptions.find(opt => opt.value === dayRecord.attendanceStatus)?.label || dayRecord.attendanceStatus
                                                : "Full Day"}
                                            </span>
                                          </div>
                                        )}
                                      </TableCell>

                                      {/* Attendance Reason */}
                                      <TableCell>
                                        {attendanceEdits[date]?.isEditing ? (
                                          <Textarea
                                            value={attendanceEdits[date].attendanceReason}
                                            onChange={(e) => handleAttendanceReasonChange(date, e.target.value)}
                                            placeholder="Enter reason..."
                                            className="w-40 h-16 text-xs"
                                          />
                                        ) : (
                                          <div className="max-w-40 text-xs">
                                            {dayRecord.attendanceReason || "-"}
                                          </div>
                                        )}
                                      </TableCell>

                                      {/* Actions */}
                                      <TableCell>
                                        {attendanceEdits[date]?.isEditing ? (
                                          <div className="flex items-center space-x-1">
                                            <Button
                                              size="sm"
                                              onClick={() => handleSaveAttendance(date)}
                                              disabled={attendanceEdits[date]?.isSaving}
                                              className="h-7 px-2"
                                            >
                                              {attendanceEdits[date]?.isSaving ? (
                                                <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                                              ) : (
                                                <Save className="h-3 w-3" />
                                              )}
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleCancelAttendanceEdit(date)}
                                              disabled={attendanceEdits[date]?.isSaving}
                                              className="h-7 px-2"
                                            >
                                              ✕
                                            </Button>
                                          </div>
                                        ) : (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditAttendance(date, dayRecord.attendanceStatus, dayRecord.attendanceReason)}
                                            className="h-7 px-2"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Meeting Details Table */}
                        {meetingRecordsForDate.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-sm">
                                Meeting Details
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow className={colorClass}>
                                      <TableHead>Employee Name</TableHead>
                                      <TableHead>Company Name</TableHead>
                                      <TableHead>Date</TableHead>
                                      <TableHead>Lead ID</TableHead>
                                      <TableHead>Meeting In Time</TableHead>
                                      <TableHead>Meeting In Location</TableHead>
                                      <TableHead>Meeting Out Time</TableHead>
                                      <TableHead>
                                        Meeting Out Location
                                      </TableHead>
                                      <TableHead>Total Stay Time</TableHead>
                                      <TableHead>Discussion</TableHead>
                                      <TableHead>Meeting Person</TableHead>
                                      <TableHead>History</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {meetingRecordsForDate.map(
                                      (record, index) => (
                                        <TableRow
                                          key={index}
                                          className={`${colorClass} opacity-80`}
                                        >
                                          <TableCell>
                                            {analytics.find(
                                              (emp) =>
                                                emp.employeeId ===
                                                selectedEmployee,
                                            )?.employeeName ||
                                              record.employeeName}
                                          </TableCell>
                                          <TableCell>
                                            {record.companyName}
                                          </TableCell>
                                          <TableCell>
                                            {format(
                                              new Date(record.date),
                                              "MM/dd/yyyy",
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {record.leadId || "-"}
                                          </TableCell>
                                          <TableCell>
                                            {record.meetingInTime}
                                          </TableCell>
                                          <TableCell>
                                            {record.meetingInLocation}
                                          </TableCell>
                                          <TableCell>
                                            {record.meetingOutTime}
                                          </TableCell>
                                          <TableCell>
                                            {record.meetingOutLocation}
                                          </TableCell>
                                          <TableCell>
                                            {formatHours(record.totalStayTime)}
                                          </TableCell>
                                          <TableCell className="max-w-xs truncate">
                                            {record.discussion || "-"}
                                          </TableCell>
                                          <TableCell>
                                            {record.meetingPerson}
                                          </TableCell>
                                          <TableCell>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                // Show history for this specific meeting's lead/employee combination
                                                const employeeId = selectedEmployee!;
                                                const leadId = record.leadId;
                                                handleViewMeetingHistory(employeeId, leadId);
                                              }}
                                            >
                                              <History className="h-4 w-4 mr-1" />
                                              History
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ),
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    );
                  });
                })()}

                {employeeDayRecords.length === 0 &&
                  employeeMeetingRecords.length === 0 && (
                    <Card>
                      <CardContent className="py-12">
                        <div className="text-center">
                          <p className="text-muted-foreground">
                            No data available for the selected employee and date
                            range
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Meeting History Modal */}
      <Dialog open={meetingHistoryModal.isOpen} onOpenChange={closeMeetingHistoryModal}>
        <DialogContent className="sm:max-w-[1200px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <History className="h-5 w-5 text-primary" />
              <span>Meeting History - {meetingHistoryModal.employeeName} (ID: {meetingHistoryModal.employeeId})</span>
            </DialogTitle>
            <DialogDescription>
              Complete meeting history and interactions for this employee
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {meetingHistoryModal.loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading meeting history...</p>
              </div>
            ) : meetingHistoryModal.meetingHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No meeting history found for this employee</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Lead ID</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Contact Person</TableHead>
                      <TableHead>Contact Details</TableHead>
                      <TableHead>Discussion</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meetingHistoryModal.meetingHistory.map((meeting, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {format(new Date(meeting.timestamp), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {meetingHistoryModal.employeeName}
                        </TableCell>
                        <TableCell className="font-medium">
                          {meeting.meetingDetails?.customerName ||
                           meeting.meetingDetails?.customers?.[0]?.customerName ||
                           meeting.leadInfo?.companyName || "-"}
                        </TableCell>
                        <TableCell>
                          {meeting.leadId ? (
                            <Badge variant="outline">{meeting.leadId}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {meeting.meetingDetails?.customers?.map(customer => customer.customerName).join(", ") ||
                           meeting.meetingDetails?.customerName || "-"}
                        </TableCell>
                        <TableCell>
                          {meeting.meetingDetails?.customers?.map(customer => customer.customerEmployeeName).join(", ") ||
                           meeting.meetingDetails?.customerEmployeeName || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-1">
                            {(meeting.meetingDetails?.customers?.[0]?.customerEmail || meeting.meetingDetails?.customerEmail) && (
                              <div>📧 {meeting.meetingDetails?.customers?.[0]?.customerEmail || meeting.meetingDetails?.customerEmail}</div>
                            )}
                            {(meeting.meetingDetails?.customers?.[0]?.customerMobile || meeting.meetingDetails?.customerMobile) && (
                              <div>📱 {meeting.meetingDetails?.customers?.[0]?.customerMobile || meeting.meetingDetails?.customerMobile}</div>
                            )}
                            {(meeting.meetingDetails?.customers?.[0]?.customerDesignation || meeting.meetingDetails?.customerDesignation) && (
                              <div>💼 {meeting.meetingDetails?.customers?.[0]?.customerDesignation || meeting.meetingDetails?.customerDesignation}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate" title={meeting.meetingDetails?.discussion}>
                            {meeting.meetingDetails?.discussion || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-success text-success-foreground">
                            Completed
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
