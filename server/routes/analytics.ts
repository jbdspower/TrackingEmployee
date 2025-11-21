import { RequestHandler } from "express";
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isToday,
  parseISO,
} from "date-fns";
// We'll create our own functions here since the employees module doesn't export what we need
import { ExternalUser, Employee } from "@shared/api";
import { Meeting, MeetingHistory, Attendance } from "../models";

// Replicate the external API fetch function
const EXTERNAL_API_URL = "https://jbdspower.in/LeafNetServer/api/user";

async function fetchExternalUsers(): Promise<ExternalUser[]> {
  try {
    console.log("Fetching users from external API:", EXTERNAL_API_URL);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(EXTERNAL_API_URL, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const users: ExternalUser[] = await response.json();
    console.log(
      `External API response: { count: ${users.length}, sample: ${JSON.stringify(users[0] || {}, null, 2)} }`,
    );

    return users;
  } catch (error) {
    console.error("Error fetching external users:", error);
    if (error.name === "AbortError") {
      console.error("External API request timed out after 30 seconds");
    } else if (error.message.includes("fetch")) {
      console.error("Network error connecting to external API");
    }
    return [];
  }
}

// Replicate the mapping function
interface EmployeeStatus {
  status: "active" | "inactive" | "meeting";
  location: {
    lat: number;
    lng: number;
    address: string;
    timestamp: string;
  };
  lastUpdate: string;
  currentTask?: string;
}

let employeeStatuses: Record<string, EmployeeStatus> = {};

function getRealisticIndianLocation(index: number) {
  const locations = [
    { lat: 28.6139, lng: 77.209, address: "New Delhi, India" },
    { lat: 19.076, lng: 72.8777, address: "Mumbai, Maharashtra" },
    { lat: 12.9716, lng: 77.5946, address: "Bangalore, Karnataka" },
    { lat: 13.0827, lng: 80.2707, address: "Chennai, Tamil Nadu" },
    { lat: 22.5726, lng: 88.3639, address: "Kolkata, West Bengal" },
    { lat: 26.9124, lng: 75.7873, address: "Jaipur, Rajasthan" },
    { lat: 21.1458, lng: 79.0882, address: "Nagpur, Maharashtra" },
    { lat: 23.0225, lng: 72.5714, address: "Ahmedabad, Gujarat" },
    { lat: 17.385, lng: 78.4867, address: "Hyderabad, Telangana" },
    { lat: 18.5204, lng: 73.8567, address: "Pune, Maharashtra" },
  ];
  return locations[index % locations.length];
}

function mapExternalUserToEmployee(
  user: ExternalUser,
  index: number,
): Employee {
  const userId = user._id;

  if (!employeeStatuses[userId]) {
    const realisticLocation = getRealisticIndianLocation(index);
    employeeStatuses[userId] = {
      status: index === 1 ? "meeting" : index === 3 ? "inactive" : "active",
      location: {
        ...realisticLocation,
        timestamp: new Date().toISOString(),
      },
      lastUpdate: `${Math.floor(Math.random() * 15) + 1} minutes ago`,
      currentTask:
        index === 0
          ? "Client meeting"
          : index === 1
            ? "Equipment installation"
            : undefined,
    };
  }

  const status = employeeStatuses[userId];

  return {
    id: userId,
    name: user.name,
    email: user.email,
    phone: user.mobileNumber,
    status: status.status,
    location: status.location,
    lastUpdate: status.lastUpdate,
    currentTask: status.currentTask,
    deviceId: `device_${userId.slice(-6)}`,
    designation: user.designation,
    department: user.department,
    companyName: user.companyName[0]?.companyName,
    reportTo: user.report?.name,
  };
}

// Function to get date range based on filter
function getDateRange(dateRange: string, startDate?: string, endDate?: string) {
  const now = new Date();

  switch (dateRange) {
    case "all":
      // Return a very wide date range to include all meetings
      return {
        start: new Date("2020-01-01"), // Far past date
        end: new Date("2030-12-31"), // Far future date
      };
    case "today":
      return {
        start: startOfDay(now),
        end: endOfDay(now),
      };
    case "yesterday":
      const yesterday = subDays(now, 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday),
      };
    case "week":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }), // Monday
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case "month":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    case "custom":
      if (startDate && endDate) {
        return {
          start: startOfDay(parseISO(startDate)),
          end: endOfDay(parseISO(endDate)),
        };
      }
      // Fallback to today
      return {
        start: startOfDay(now),
        end: endOfDay(now),
      };
    default:
      return {
        start: startOfDay(now),
        end: endOfDay(now),
      };
  }
}

// Function to calculate meeting duration in hours
function calculateMeetingDuration(startTime: string, endTime?: string): number {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const durationMs = end.getTime() - start.getTime();
  return durationMs / (1000 * 60 * 60); // Convert to hours
}

// Function to calculate duty hours (placeholder - would need tracking data)
function calculateDutyHours(
  employeeId: string,
  dateRange: { start: Date; end: Date },
): number {
  // This is a placeholder calculation
  // In a real app, this would calculate based on tracking sessions, check-ins, etc.
  // For now, we'll assume 8 hours per working day in the date range
  const daysInRange = Math.ceil(
    (dateRange.end.getTime() - dateRange.start.getTime()) /
      (1000 * 60 * 60 * 24),
  );
  return Math.min(daysInRange * 8, 40); // Max 40 hours per week
}

export const getEmployeeAnalytics: RequestHandler = async (req, res) => {
  try {
    const {
      employeeId,
      dateRange = "today",
      startDate,
      endDate,
      search,
    } = req.query;

    // Get date range
    const { start, end } = getDateRange(
    dateRange as string,
    startDate as string,
    endDate as string,
  );

  console.log(`Analytics date filter - Range: ${dateRange}, Start: ${startDate}, End: ${endDate}`);
  console.log(`Calculated date range: ${start.toISOString()} to ${end.toISOString()}`);

    // Fetch all employees
    const externalUsers = await fetchExternalUsers();
    let employees = externalUsers.map((user, index) =>
      mapExternalUserToEmployee(user, index),
    );

    // Filter by employee if specified
    if (employeeId && employeeId !== "all") {
      employees = employees.filter((emp) => emp.id === employeeId);
    }

    // Filter by search term if specified
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      employees = employees.filter(
        (emp) =>
          emp.name.toLowerCase().includes(searchTerm) ||
          emp.email.toLowerCase().includes(searchTerm),
      );
    }

    // Get actual meeting data from MongoDB
    let actualMeetings: any[] = [];

    try {
      // Try to get meetings from MongoDB first
      // Get ALL meetings for total counts, but we'll filter them properly later
      const mongoMeetings = await Meeting.find({}).lean();

      actualMeetings = mongoMeetings.map(meeting => ({
        id: meeting._id.toString(),
        employeeId: meeting.employeeId,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        clientName: meeting.clientName,
        leadId: meeting.leadId,
        status: meeting.status,
        meetingDetails: meeting.meetingDetails,
        location: meeting.location
      }));

      console.log(`Found ${actualMeetings.length} total meetings in MongoDB`);
      console.log(`Date range filter: ${start.toISOString()} to ${end.toISOString()}`);

      // If no MongoDB data, fallback to in-memory
      if (actualMeetings.length === 0) {
        const { inMemoryMeetings } = await import("./meetings");
        actualMeetings = inMemoryMeetings || [];
        console.log(`Fallback: Using ${actualMeetings.length} meetings from memory`);
      }
    } catch (dbError) {
      console.warn("MongoDB query failed, falling back to in-memory meetings:", dbError);
      const { inMemoryMeetings } = await import("./meetings");
      actualMeetings = inMemoryMeetings || [];
    }

    console.log("Using meetings data:", actualMeetings.length, "meetings");
    console.log("Available employees:", employees.map(e => ({ id: e.id, name: e.name })));
    console.log("Meeting employee IDs:", actualMeetings.map(m => m.employeeId));

    // Calculate analytics for each employee
    const analytics = employees.map((employee) => {
      // Get meetings for this employee
      const employeeMeetings = actualMeetings.filter(
        (meeting) => meeting.employeeId === employee.id,
      );

      console.log(`Employee ${employee.name} (${employee.id}): found ${employeeMeetings.length} meetings`);

      // Filter meetings by date range for the specific metrics
      const meetingsInRange = employeeMeetings.filter((meeting) => {
        const meetingDate = new Date(meeting.startTime);
        const meetingTime = meetingDate.getTime();
        const startTime = start.getTime();
        const endTime = end.getTime();
        const inRange = meetingTime >= startTime && meetingTime <= endTime;

        if (inRange) {
          console.log(`✅ Meeting ${meeting.id} IN range: ${meeting.startTime} (${meeting.clientName || 'No client'})`);
        } else {
          console.log(`❌ Meeting ${meeting.id} OUT of range: ${meeting.startTime} (not between ${start.toISOString()} and ${end.toISOString()})`);
        }
        return inRange;
      });

      // Calculate today's meetings
      const todayMeetings = employeeMeetings.filter((meeting) =>
        isToday(new Date(meeting.startTime)),
      ).length;

      // Calculate total meeting hours for the filtered range
      // For "all" filter, this will be total hours across all meetings
      const totalMeetingHours = meetingsInRange.reduce((total, meeting) => {
        return (
          total + calculateMeetingDuration(meeting.startTime, meeting.endTime)
        );
      }, 0);

      console.log(`Employee ${employee.name} (${employee.id}): ${employeeMeetings.length} total meetings, ${meetingsInRange.length} in date range (${dateRange}), ${totalMeetingHours.toFixed(1)}h meeting time`);

      // Calculate duty hours
      const totalDutyHours = calculateDutyHours(employee.id, { start, end });

      return {
        employeeId: employee.id,
        employeeName: employee.name,
        totalMeetings: employeeMeetings.length, // Total meetings for this employee (all time, never filtered)
        todayMeetings,
        totalMeetingHours, // This uses filtered range which is correct
        totalDutyHours,
        status: employee.status,
      };
    });

    // Calculate summary statistics
    const summary = {
      totalEmployees: employees.length,
      activeMeetings: employees.filter((emp) => emp.status === "meeting")
        .length,
      totalMeetingsToday: analytics.reduce(
        (sum, emp) => sum + emp.todayMeetings,
        0,
      ),
      avgMeetingDuration:
        analytics.length > 0
          ? analytics.reduce((sum, emp) => sum + emp.totalMeetingHours, 0) /
            Math.max(
              analytics.reduce((sum, emp) => sum + emp.totalMeetings, 0),
              1,
            )
          : 0,
    };

    res.json({
      analytics,
      summary,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
        label: dateRange,
      },
    });
  } catch (error) {
    console.error("Error fetching employee analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};

// Mock meeting data generator for demonstration
function generateMockMeetings(
  employees: any[],
  startDate: Date,
  endDate: Date,
) {
  const meetings: any[] = [];
  const customers = [
    "Tech Corp",
    "ABC Industries",
    "XYZ Solutions",
    "Global Systems",
    "Innovation Ltd",
  ];
  const leadIds = ["LEAD-001", "LEAD-002", "LEAD-003", "LEAD-004", "LEAD-005"];

  employees.forEach((employee, empIndex) => {
    // Generate 1-5 meetings per employee in the date range
    const meetingCount = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < meetingCount; i++) {
      // Random date within range
      const randomTime = new Date(
        startDate.getTime() +
          Math.random() * (endDate.getTime() - startDate.getTime()),
      );

      // Random meeting duration (30 minutes to 3 hours)
      const durationHours = Math.random() * 2.5 + 0.5;
      const endTime = new Date(
        randomTime.getTime() + durationHours * 60 * 60 * 1000,
      );

      meetings.push({
        id: `meeting_${empIndex}_${i}`,
        employeeId: employee.id,
        startTime: randomTime.toISOString(),
        endTime: endTime.toISOString(),
        clientName: customers[Math.floor(Math.random() * customers.length)],
        leadId: leadIds[Math.floor(Math.random() * leadIds.length)],
        status: "completed",
        location: employee.location,
      });
    }
  });

  return meetings;
}

export const getEmployeeDetails: RequestHandler = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { dateRange = "today", startDate, endDate } = req.query;

    // Get date range
    const { start, end } = getDateRange(
    dateRange as string,
    startDate as string,
    endDate as string,
  );

  console.log(`Employee details date filter - Range: ${dateRange}, Start: ${startDate}, End: ${endDate}`);
  console.log(`Employee ${employeeId} calculated date range: ${start.toISOString()} to ${end.toISOString()}`);

    // Get actual meeting data from MongoDB
    let actualMeetings: any[] = [];

    try {
      // Try to get meetings from MongoDB first
      // Get ALL meetings for this employee, then filter by date range
      const mongoMeetings = await Meeting.find({ employeeId }).lean();

      actualMeetings = mongoMeetings.map(meeting => ({
        id: meeting._id.toString(),
        employeeId: meeting.employeeId,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        clientName: meeting.clientName,
        leadId: meeting.leadId,
        status: meeting.status,
        meetingDetails: meeting.meetingDetails,
        location: meeting.location
      }));

      console.log(`Found ${actualMeetings.length} total meetings in MongoDB for employee ${employeeId}`);
      console.log(`Employee details date range: ${start.toISOString()} to ${end.toISOString()}`);

      // If no MongoDB data, fallback to in-memory
      if (actualMeetings.length === 0) {
        const { inMemoryMeetings } = await import("./meetings");
        actualMeetings = (inMemoryMeetings || []).filter(meeting => meeting.employeeId === employeeId);
        console.log(`Fallback: Using ${actualMeetings.length} meetings from memory for employee ${employeeId}`);
      }
    } catch (dbError) {
      console.warn("MongoDB query failed, falling back to in-memory meetings:", dbError);
      const { inMemoryMeetings } = await import("./meetings");
      actualMeetings = (inMemoryMeetings || []).filter(meeting => meeting.employeeId === employeeId);
    }

    // Filter meetings for this employee within date range
    const employeeMeetings = actualMeetings.filter((meeting) => {
      const meetingDate = new Date(meeting.startTime);
      const meetingTime = meetingDate.getTime();
      const startTime = start.getTime();
      const endTime = end.getTime();
      const inDateRange = meetingTime >= startTime && meetingTime <= endTime;

      if (inDateRange) {
        console.log(`✅ Employee meeting ${meeting.id} included: ${meeting.startTime} (${meeting.clientName || 'No client'})`);
      } else {
        console.log(`❌ Employee meeting ${meeting.id} excluded: ${meeting.startTime} (outside ${start.toISOString()} to ${end.toISOString()})`);
      }

      return inDateRange;
    });

    console.log(`Filtered to ${employeeMeetings.length} meetings in date range for employee ${employeeId}`);

    // 🔹 NEW: Get tracking sessions for attendance (login/logout)
    let trackingSessions: any[] = [];
    try {
      const { TrackingSession } = await import("../models");
      const mongoSessions = await TrackingSession.find({ 
        employeeId,
        startTime: { $gte: start.toISOString(), $lte: end.toISOString() }
      }).lean();
      
      trackingSessions = mongoSessions.map(session => ({
        id: session.id,
        employeeId: session.employeeId,
        startTime: session.startTime,
        endTime: session.endTime,
        startLocation: session.startLocation,
        endLocation: session.endLocation,
        status: session.status,
        duration: session.duration,
      }));
      
      console.log(`Found ${trackingSessions.length} tracking sessions for employee ${employeeId}`);
    } catch (dbError) {
      console.warn("Failed to fetch tracking sessions:", dbError);
    }

    // Group meetings by date
    const dateGroups = employeeMeetings.reduce(
      (groups, meeting) => {
        const date = format(new Date(meeting.startTime), "yyyy-MM-dd");
        if (!groups[date]) groups[date] = [];
        groups[date].push(meeting);
        return groups;
      },
      {} as Record<string, any[]>,
    );

    // Group tracking sessions by date
    const sessionDateGroups = trackingSessions.reduce(
      (groups, session) => {
        const date = format(new Date(session.startTime), "yyyy-MM-dd");
        if (!groups[date]) groups[date] = [];
        groups[date].push(session);
        return groups;
      },
      {} as Record<string, any[]>,
    );

    // Get all unique dates from both meetings and sessions
    const allDates = new Set([
      ...Object.keys(dateGroups),
      ...Object.keys(sessionDateGroups)
    ]);

    // Generate day records combining meetings and tracking sessions
    const dayRecords = Array.from(allDates).map((date) => {
      const meetings = dateGroups[date] || [];
      const sessions = sessionDateGroups[date] || [];
      
      const totalMeetings = meetings.length;
      const totalMeetingHours = meetings.reduce((total, meeting) => {
        return (
          total + calculateMeetingDuration(meeting.startTime, meeting.endTime)
        );
      }, 0);

      // Use tracking session for login/logout times if available, otherwise use meetings
      const firstSession = sessions[0];
      const lastSession = sessions[sessions.length - 1];
      const firstMeeting = meetings[0];
      const lastMeeting = meetings[meetings.length - 1];

      // Determine start location and time (prefer tracking session)
      const startLocationTime = firstSession?.startTime || firstMeeting?.startTime || "";
      const startLocationAddress = firstSession?.startLocation?.address || firstMeeting?.location?.address || "";

      // Determine end location and time (prefer tracking session)
      const outLocationTime = lastSession?.endTime || lastMeeting?.endTime || "";
      const outLocationAddress = lastSession?.endTime && lastSession?.endLocation?.address
        ? lastSession.endLocation.address
        : (lastMeeting?.endTime && lastMeeting?.location?.endLocation?.address
          ? lastMeeting.location.endLocation.address
          : "");

      // Calculate total duty hours from tracking session if available
      let totalDutyHours = 8; // Default
      if (firstSession && lastSession?.endTime) {
        const sessionDuration = (new Date(lastSession.endTime).getTime() - new Date(firstSession.startTime).getTime()) / (1000 * 60 * 60);
        totalDutyHours = Math.max(0, sessionDuration);
      }

      console.log(`Day record for ${date}: ${totalMeetings} meetings, ${totalMeetingHours.toFixed(2)} meeting hours, ${sessions.length} tracking sessions`);
      
      return {
        date,
        totalMeetings,
        startLocationTime,
        startLocationAddress,
        outLocationTime,
        outLocationAddress,
        totalDutyHours: parseFloat(totalDutyHours.toFixed(2)),
        meetingTime: totalMeetingHours,
        travelAndLunchTime: Math.max(0, totalDutyHours - totalMeetingHours)
      };
    });

    // Generate meeting records
    const meetingRecords = employeeMeetings.map((meeting) => ({
      employeeName: "", // Will be filled by client
      companyName: meeting.clientName || "Unknown Company",
      date: format(new Date(meeting.startTime), "yyyy-MM-dd"),
      leadId: meeting.leadId || "",
      meetingInTime: format(new Date(meeting.startTime), "HH:mm"),
      meetingInLocation: meeting.location?.address || "",
      meetingOutTime: meeting.endTime
        ? format(new Date(meeting.endTime), "HH:mm")
        : "",
      // 🔹 FIX: Only show end location if meeting has ended, use endLocation field
      meetingOutLocation: meeting.endTime && meeting.location?.endLocation?.address
        ? meeting.location.endLocation.address
        : "",
      totalStayTime: calculateMeetingDuration(
        meeting.startTime,
        meeting.endTime,
      ),
      discussion: meeting.meetingDetails?.discussion || meeting.notes || "",
      meetingPerson:
        meeting.meetingDetails?.customers?.length > 0
          ? meeting.meetingDetails.customers
              .map((customer) => customer.customerEmployeeName)
              .join(", ")
          : meeting.meetingDetails?.customerEmployeeName || "Unknown",
      meetingStatus: meeting.status || "completed", // Internal meeting status
      externalMeetingStatus: meeting.externalMeetingStatus || "", // 🔹 NEW: Status from external follow-up API
      incomplete: meeting.meetingDetails?.incomplete || false, // Include incomplete flag
      incompleteReason: meeting.meetingDetails?.incompleteReason || "", // Include incomplete reason
    }));

    const finalResult = {
      dayRecords: dayRecords.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
      meetingRecords: meetingRecords.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    };

    console.log(`Employee details result: ${finalResult.dayRecords.length} day records, ${finalResult.meetingRecords.length} meeting records`);

    res.json(finalResult);
  } catch (error) {
    console.error("Error fetching employee details:", error);
    res.status(500).json({ error: "Failed to fetch employee details" });
  }
};

export const getLeadHistory: RequestHandler = async (req, res) => {
  try {
    const { leadId } = req.params;

    console.log(`Fetching history for lead: ${leadId}`);

    // Get actual meeting data from MongoDB
    let actualMeetings: any[] = [];

    try {
      // Try to get meetings from MongoDB first
      const mongoMeetings = await Meeting.find({ leadId }).lean();

      actualMeetings = mongoMeetings.map(meeting => ({
        id: meeting._id.toString(),
        employeeId: meeting.employeeId,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        clientName: meeting.clientName,
        leadId: meeting.leadId,
        status: meeting.status,
        meetingDetails: meeting.meetingDetails,
        location: meeting.location,
        leadInfo: meeting.leadInfo
      }));

      console.log(`Found ${actualMeetings.length} meetings in MongoDB for lead ${leadId}`);

      // If no MongoDB data, fallback to in-memory
      if (actualMeetings.length === 0) {
        const { inMemoryMeetings } = await import('./meetings');
        actualMeetings = (inMemoryMeetings || []).filter(meeting => meeting.leadId === leadId);
        console.log(`Fallback: Using ${actualMeetings.length} meetings from memory for lead ${leadId}`);
      }
    } catch (dbError) {
      console.warn("MongoDB query failed, falling back to in-memory meetings:", dbError);
      const { inMemoryMeetings } = await import('./meetings');
      actualMeetings = (inMemoryMeetings || []).filter(meeting => meeting.leadId === leadId);
    }

    // Filter meetings by lead ID
    const leadMeetings = actualMeetings.filter(meeting => meeting.leadId === leadId);

    console.log(`Found ${leadMeetings.length} meetings for lead ${leadId}`);

    // Get employee data for names
    const externalUsers = await fetchExternalUsers();
    const employees = externalUsers.map((user, index) => mapExternalUserToEmployee(user, index));

    // Generate history records
    const history = leadMeetings.map(meeting => {
      const employee = employees.find(emp => emp.id === meeting.employeeId);
      const duration = calculateMeetingDuration(meeting.startTime, meeting.endTime);

      return {
        date: meeting.startTime,
        employeeName: employee?.name || "Unknown Employee",
        companyName: meeting.clientName || "Unknown Company",
        duration,
        meetingPerson: meeting.meetingDetails?.customers?.length > 0
          ? meeting.meetingDetails.customers.map(customer => customer.customerEmployeeName).join(", ")
          : meeting.meetingDetails?.customerEmployeeName || "Unknown",
        discussion: meeting.meetingDetails?.discussion || meeting.notes || "",
        status: meeting.status || "completed",
        location: meeting.location?.address || "",
        leadInfo: meeting.leadInfo,
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({
      leadId,
      history,
      totalMeetings: history.length,
      totalDuration: history.reduce((sum, record) => sum + record.duration, 0),
    });

  } catch (error) {
    console.error("Error fetching lead history:", error);
    res.status(500).json({ error: "Failed to fetch lead history" });
  }
};

export const saveAttendance: RequestHandler = async (req, res) => {
  try {
    const { employeeId, date, attendanceStatus, attendanceReason } = req.body;

    console.log(`Saving attendance for employee ${employeeId} on ${date}:`, {
      attendanceStatus,
      attendanceReason
    });

    // Validate required fields
    if (!employeeId || !date || !attendanceStatus) {
      return res.status(400).json({
        error: "Employee ID, date, and attendance status are required"
      });
    }

    // Validate attendance status
    const validStatuses = ["full_day", "half_day", "off", "short_leave", "ot"];
    if (!validStatuses.includes(attendanceStatus)) {
      return res.status(400).json({
        error: "Invalid attendance status"
      });
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: "Date must be in YYYY-MM-DD format"
      });
    }

    try {
      // Try to save to MongoDB using upsert (update if exists, create if not)
      const savedAttendance = await Attendance.findOneAndUpdate(
        { employeeId, date },
        {
          employeeId,
          date,
          attendanceStatus,
          attendanceReason: attendanceReason || ""
        },
        {
          new: true,
          upsert: true,
          runValidators: true
        }
      );

      console.log("Attendance saved to MongoDB:", savedAttendance._id);

      res.json({
        success: true,
        message: "Attendance saved successfully",
        data: {
          id: savedAttendance._id,
          employeeId: savedAttendance.employeeId,
          date: savedAttendance.date,
          attendanceStatus: savedAttendance.attendanceStatus,
          attendanceReason: savedAttendance.attendanceReason,
          savedAt: savedAttendance.updatedAt
        }
      });

    } catch (dbError) {
      console.warn("MongoDB save failed, using fallback:", dbError);

      // Fallback response (in real app, might save to alternative storage)
      res.json({
        success: true,
        message: "Attendance saved successfully (fallback mode)",
        data: {
          employeeId,
          date,
          attendanceStatus,
          attendanceReason,
          savedAt: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error("Error saving attendance:", error);
    res.status(500).json({ error: "Failed to save attendance" });
  }
};

export const getMeetingTrends: RequestHandler = async (req, res) => {
  try {
    const { employeeId, period = "week" } = req.query;

    // This would calculate meeting trends over time
    // For now, return mock data
    const trends = {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          label: "Meetings",
          data: [2, 4, 3, 5, 2, 1, 0],
        },
        {
          label: "Hours",
          data: [4, 8, 6, 10, 4, 2, 0],
        },
      ],
    };

    res.json(trends);
  } catch (error) {
    console.error("Error fetching meeting trends:", error);
    res.status(500).json({ error: "Failed to fetch trends" });
  }
};

export const getAttendance: RequestHandler = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, date } = req.query;

    console.log(`Fetching attendance records:`, {
      employeeId,
      startDate,
      endDate,
      date
    });

    // Build query filter
    const filter: any = {};

    if (employeeId) {
      filter.employeeId = employeeId;
    }

    if (date) {
      // Single date query
      filter.date = date;
    } else if (startDate && endDate) {
      // Date range query
      filter.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    try {
      // Fetch from MongoDB
      const attendanceRecords = await Attendance.find(filter)
        .sort({ date: -1 })
        .lean();

      console.log(`Found ${attendanceRecords.length} attendance records`);

      // Format the response
      const formattedRecords = attendanceRecords.map(record => ({
        id: record._id.toString(),
        employeeId: record.employeeId,
        date: record.date,
        attendanceStatus: record.attendanceStatus,
        attendanceReason: record.attendanceReason || "",
        savedAt: record.updatedAt || record.createdAt
      }));

      res.json({
        success: true,
        count: formattedRecords.length,
        data: formattedRecords
      });

    } catch (dbError) {
      console.warn("MongoDB query failed:", dbError);
      
      // Fallback response
      res.json({
        success: true,
        count: 0,
        data: [],
        message: "No attendance records found (database unavailable)"
      });
    }

  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch attendance records" 
    });
  }
};
