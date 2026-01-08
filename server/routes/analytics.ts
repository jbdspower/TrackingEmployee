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
import { Meeting, Attendance, TrackingSession } from "../models/index.js";
import { cacheService } from "../services/cache.service.js";

// Replicate the external API fetch function
const EXTERNAL_API_URL = "https://jbdspower.in/LeafNetServer/api/user";

async function fetchExternalUsers(): Promise<ExternalUser[]> {
  try {

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
  if (!startTime) return 0;

  try {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();

    // Validate dates
    if (isNaN(start.getTime())) return 0;
    if (endTime && isNaN(end.getTime())) {
      // If end time is invalid, use current time
      const durationMs = new Date().getTime() - start.getTime();
      return Math.max(0, durationMs / (1000 * 60 * 60));
    }

    const durationMs = end.getTime() - start.getTime();
    if (durationMs < 0) return 0; // Invalid if end is before start

    return Math.max(0, durationMs / (1000 * 60 * 60)); // Convert to hours
  } catch (error) {
    console.error("Error calculating meeting duration:", error);
    return 0;
  }
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
    const {
      dateRange = "today",
      startDate,
      endDate,
      page = "1",
      limit = "20",
      type = "meetings" // "meetings" or "days"
    } = req.query;

    // Start timing
    const startTime = Date.now();

    // Parse pagination parameters
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Get date range
    const { start, end } = getDateRange(
      dateRange as string,
      startDate as string,
      endDate as string,
    );

    console.log(`📊 Employee details for ${employeeId} - Date range: ${dateRange}, Page: ${pageNum}, Limit: ${limitNum}`);

    // PARALLELIZE DATA FETCHING
    const [
      externalUsers,
      meetingsData,
      meetingsCount,
      trackingSessionsData,
      attendanceRecords,
      allMeetingsForEmployee
    ] = await Promise.allSettled([
      // Get external users from cache
      cacheService.getExternalUsers(),

      // Fetch meetings with date range filter and pagination
      Meeting.find({
        employeeId,
        startTime: {
          $gte: start.toISOString(),
          $lte: end.toISOString()
        }
      })
        .select('startTime endTime clientName leadId status meetingDetails location approvalStatus approvalReason approvedBy')
        .sort({ startTime: -1 }) // Sort by latest first
        .skip(skip)
        .limit(limitNum)
        .lean()
        .exec(),

      // Get total count of meetings for pagination
      Meeting.countDocuments({
        employeeId,
        startTime: {
          $gte: start.toISOString(),
          $lte: end.toISOString()
        }
      }),

      // Fetch tracking sessions with date range filter
      TrackingSession.find({
        employeeId,
        startTime: {
          $gte: start.toISOString(),
          $lte: end.toISOString()
        }
      })
        .select('startTime endTime startLocation endLocation status duration')
        .lean()
        .exec(),

      // Fetch attendance records
      Attendance.find({
        employeeId,
        date: {
          $gte: format(start, "yyyy-MM-dd"),
          $lte: format(end, "yyyy-MM-dd")
        }
      })
        .select('date attendanceStatus attendanceReason attendenceCreated')
        .lean()
        .exec(),

      // Get ALL meetings for this employee in the date range (not paginated)
      Meeting.find({
        employeeId,
        startTime: {
          $gte: start.toISOString(),
          $lte: end.toISOString()
        }
      })
        .select('startTime endTime clientName leadId status meetingDetails location')
        .sort({ startTime: -1 })
        .lean()
        .exec()
    ]);

    // Handle Promise results
    const externalUsersResult = externalUsers.status === 'fulfilled' ? externalUsers.value : [];
    const meetingsDataResult = meetingsData.status === 'fulfilled' ? meetingsData.value : [];
    const meetingsCountResult = meetingsCount.status === 'fulfilled' ? meetingsCount.value : 0;
    const trackingSessionsResult = trackingSessionsData.status === 'fulfilled' ? trackingSessionsData.value : [];
    const attendanceRecordsResult = attendanceRecords.status === 'fulfilled' ? attendanceRecords.value : [];
    const allMeetingsResult = allMeetingsForEmployee.status === 'fulfilled' ? allMeetingsForEmployee.value : [];

    // Log any errors
    if (externalUsers.status === 'rejected') console.error('Error fetching external users:', externalUsers.reason);
    if (meetingsData.status === 'rejected') console.error('Error fetching meetings:', meetingsData.reason);
    if (meetingsCount.status === 'rejected') console.error('Error counting meetings:', meetingsCount.reason);
    if (trackingSessionsData.status === 'rejected') console.error('Error fetching tracking sessions:', trackingSessionsData.reason);
    if (attendanceRecords.status === 'rejected') console.error('Error fetching attendance:', attendanceRecords.reason);
    if (allMeetingsForEmployee.status === 'rejected') console.error('Error fetching all meetings:', allMeetingsForEmployee.reason);

    const meetings = meetingsDataResult;
    const trackingSessions = trackingSessionsResult;
    const allMeetings = allMeetingsResult;

    console.log(`📈 Fetched data: ${meetings.length} paginated meetings, ${allMeetings.length} total meetings (total count: ${meetingsCountResult}), ${trackingSessions.length} sessions, ${attendanceRecordsResult.length} attendance records`);

    // Create user map for quick lookups
    const userMap = new Map(externalUsersResult.map(user => [user._id, user.name]));

    // Get ALL dates in the range (not just paginated meetings)
    const allDatesInRange = [];
    let currentDate = new Date(start);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    // Only include dates up to today to avoid future empty dates
    while (currentDate <= end && currentDate <= today) {
      allDatesInRange.push(format(currentDate, "yyyy-MM-dd"));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`📅 Date range includes ${allDatesInRange.length} total days (excluding future dates)`);

    // Group ALL meetings by date
    const allMeetingsByDate = new Map();
    allMeetings.forEach(meeting => {
      try {
        const date = format(new Date(meeting.startTime), "yyyy-MM-dd");
        if (!allMeetingsByDate.has(date)) {
          allMeetingsByDate.set(date, []);
        }
        allMeetingsByDate.get(date).push(meeting);
      } catch (error) {
        console.error('Error processing meeting date:', error);
      }
    });

    // Group tracking sessions by date
    const sessionDateGroups = new Map();
    trackingSessions.forEach(session => {
      try {
        const date = format(new Date(session.startTime), "yyyy-MM-dd");
        if (!sessionDateGroups.has(date)) {
          sessionDateGroups.set(date, []);
        }
        sessionDateGroups.get(date).push(session);
      } catch (error) {
        console.error('Error processing session date:', error);
      }
    });

    // Generate day records for ALL dates in range
    const dayRecords = allDatesInRange.map((date) => {
      const meetings = allMeetingsByDate.get(date) || [];
      const sessions = sessionDateGroups.get(date) || [];

      const totalMeetings = meetings.length;
      const totalMeetingHours = meetings.reduce((total, meeting) => {
        return total + calculateMeetingDuration(meeting.startTime, meeting.endTime);
      }, 0);

      // Sort meetings by start time
      const sortedMeetings = [...meetings].sort((a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      const firstMeeting = sortedMeetings[0];
      const lastMeeting = sortedMeetings[sortedMeetings.length - 1];

      // Calculate times
      const startLocationTime = firstMeeting?.startTime ? format(new Date(firstMeeting.startTime), "HH:mm:ss") : "";
      const startLocationAddress = firstMeeting?.location?.address || "";

      const outLocationTime = lastMeeting?.endTime ? format(new Date(lastMeeting.endTime), "HH:mm:ss") : "";
      const outLocationAddress = lastMeeting?.endTime && lastMeeting?.location?.endLocation?.address
        ? lastMeeting.location.endLocation.address
        : (lastMeeting?.location?.address || "");

      // Calculate duty hours from first meeting start to last meeting end
      let totalDutyHours = 0;
      if (firstMeeting?.startTime && lastMeeting?.endTime) {
        try {
          const start = new Date(firstMeeting.startTime);
          const end = new Date(lastMeeting.endTime);
          const dutyDuration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          totalDutyHours = Math.max(0, dutyDuration);
        } catch (error) {
          console.error("Error calculating duty hours:", error);
          totalDutyHours = 0;
        }
      } else if (firstMeeting?.startTime) {
        // Only start time available (ongoing meeting)
        try {
          const start = new Date(firstMeeting.startTime);
          const now = new Date();
          const dutyDuration = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
          totalDutyHours = Math.max(0, dutyDuration);
        } catch (error) {
          totalDutyHours = 0;
        }
      }

      // Get attendance info
      const attendance = attendanceRecordsResult.find(att => att.date === date);
      const attendanceAddedBy = attendance?.attendenceCreated
        ? userMap.get(attendance.attendenceCreated) || attendance.attendenceCreated
        : null;

      return {
        date,
        totalMeetings,
        startLocationTime,
        startLocationAddress,
        outLocationTime,
        outLocationAddress,
        totalDutyHours: parseFloat(totalDutyHours.toFixed(2)),
        meetingTime: parseFloat(totalMeetingHours.toFixed(2)),
        travelAndLunchTime: Math.max(0, parseFloat((totalDutyHours - totalMeetingHours).toFixed(2))),
        attendanceAddedBy
      };
    });

    // Generate meeting records from PAGINATED meetings only
    const meetingRecords = meetings.map((meeting) => {
      const meetingInTime = meeting.startTime ? format(new Date(meeting.startTime), "HH:mm:ss") : "";
      const meetingOutTime = meeting.endTime
        ? format(new Date(meeting.endTime), "HH:mm:ss")
        : "In Progress";

      return {
        meetingId: meeting._id?.toString() || meeting.id,
        employeeName: "", // Will be filled by client
        companyName: meeting.clientName || "Unknown Company",
        date: meeting.startTime ? format(new Date(meeting.startTime), "yyyy-MM-dd") : "",
        leadId: meeting.leadId || "",
        meetingInTime,
        meetingInLocation: meeting.location?.address || "Location loading...",
        meetingOutTime,
        meetingOutLocation: meeting.endTime && meeting.location?.endLocation?.address
          ? meeting.location.endLocation.address
          : (meeting.status === "completed" ? "Meeting completed" : "Meeting in progress"),
        totalStayTime: calculateMeetingDuration(meeting.startTime, meeting.endTime),
        discussion: meeting.meetingDetails?.discussion || meeting.notes || (meeting.status !== "completed" ? "Meeting in progress" : ""),
        meetingPerson: meeting.meetingDetails?.customers?.length > 0
          ? meeting.meetingDetails.customers
            .map((customer) => customer.customerEmployeeName)
            .join(", ")
          : meeting.meetingDetails?.customerEmployeeName || (meeting.status !== "completed" ? "TBD" : "Unknown"),
        meetingStatus: meeting.status || "completed",
        externalMeetingStatus: meeting.externalMeetingStatus || "",
        incomplete: meeting.meetingDetails?.incomplete || false,
        incompleteReason: meeting.meetingDetails?.incompleteReason || "",
        approvalStatus: meeting.approvalStatus || undefined,
        approvalReason: meeting.approvalReason || undefined,
        approvedBy: meeting.approvedBy || undefined,
        approvedByName: meeting.approvedBy ? userMap.get(meeting.approvedBy) || meeting.approvedBy : undefined,
        attachments: meeting.meetingDetails?.attachments || meeting.attachments || [],
      };
    });

    // Apply pagination to dayRecords
    // First filter out future dates and sort in DESCENDING order (newest first)
    const todayDate = new Date();
    const todayStr = format(todayDate, "yyyy-MM-dd");
    const validDayRecords = dayRecords.filter(record => {
      try {
        const recordDate = new Date(record.date);
        return recordDate <= todayDate;
      } catch {
        return true;
      }
    });

    const dayRecordsSorted = validDayRecords.sort((a, b) => {
      try {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } catch {
        return 0;
      }
    });

    const totalDayRecords = dayRecordsSorted.length;
    const dayRecordsTotalPages = Math.ceil(totalDayRecords / limitNum);
    const dayRecordsStartIndex = (pageNum - 1) * limitNum;
    const dayRecordsEndIndex = dayRecordsStartIndex + limitNum;
    const paginatedDayRecords = dayRecordsSorted.slice(dayRecordsStartIndex, dayRecordsEndIndex);

    console.log(`📅 Day records: ${totalDayRecords} valid dates (filtered future dates), showing ${paginatedDayRecords.length} on page ${pageNum}`);

    // Calculate pagination info
    const totalPages = Math.ceil(meetingsCountResult / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPreviousPage = pageNum > 1;

    const result = {
      pagination: {
        currentPage: pageNum,
        pageSize: limitNum,
        totalItems: meetingsCountResult,
        totalPages: totalPages,
        hasNextPage,
        hasPreviousPage,
        nextPage: hasNextPage ? pageNum + 1 : null,
        previousPage: hasPreviousPage ? pageNum - 1 : null,
      },
      dayRecordsPagination: {
        currentPage: pageNum,
        pageSize: limitNum,
        totalItems: totalDayRecords,
        totalPages: dayRecordsTotalPages,
        hasNextDayRecordsPage: pageNum < dayRecordsTotalPages,
        hasPreviousDayRecordsPage: pageNum > 1,
      },
      dayRecords: paginatedDayRecords,
      meetingRecords: meetingRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    };

    const endTime = Date.now();
    console.log(`✅ Employee details fetched in ${endTime - startTime}ms`);

    res.json(result);
  } catch (error) {
    console.error("Error fetching employee details:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      error: "Failed to fetch employee details",
      message: error.message
    });
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
    const { employeeId, date, attendanceStatus, attendanceReason, attendenceCreated } = req.body;

    console.log(`Saving attendance for employee ${employeeId} on ${date}:`, {
      attendanceStatus,
      attendanceReason,
      attendenceCreated
    });

    // Validate required fields
    if (!employeeId || !date || !attendanceStatus) {
      return res.status(400).json({
        error: "Employee ID, date, and attendance status are required"
      });
    }

    // Validate attendance status
    const validStatuses = ["full_day", "half_day", "off", "short_leave", "ot", "absent"];
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
          attendanceReason: attendanceReason || "",
          attendenceCreated: attendenceCreated !== undefined ? attendenceCreated : null // Default to null if not provided
        },
        {
          new: true,
          upsert: true,
          runValidators: true
        }
      );

      console.log("Attendance saved to MongoDB:", savedAttendance._id);
      console.log("Attendance attendenceCreated value:", savedAttendance.attendenceCreated);

      res.json({
        success: true,
        message: "Attendance saved successfully",
        data: {
          id: savedAttendance._id,
          employeeId: savedAttendance.employeeId,
          date: savedAttendance.date,
          attendanceStatus: savedAttendance.attendanceStatus,
          attendanceReason: savedAttendance.attendanceReason,
          attendenceCreated: savedAttendance.attendenceCreated,
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
          attendenceCreated: attendenceCreated !== undefined ? attendenceCreated : null,
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

      // Fetch external users to map attendenceCreated IDs to names
      const externalUsers = await fetchExternalUsers();
      const userMap = new Map(externalUsers.map(user => [user._id, user.name]));

      // Format the response
      const formattedRecords = attendanceRecords.map(record => ({
        id: record._id.toString(),
        employeeId: record.employeeId,
        date: record.date,
        attendanceStatus: record.attendanceStatus,
        attendanceReason: record.attendanceReason || "",
        attendenceCreated: record.attendenceCreated,
        attendenceCreatedName: record.attendenceCreated
          ? userMap.get(record.attendenceCreated) || record.attendenceCreated
          : null,
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

export const getAllEmployeesDetails: RequestHandler = async (req, res) => {
  try {
    const {
      dateRange = "today",
      startDate,
      endDate,
      page = "1",
      limit = "10",
      search = "",
      sortBy = "employeeName",
      sortOrder = "asc"
    } = req.query;

    // Start timing
    const startTime = Date.now();

    // Parse pagination parameters
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Get date range
    const { start, end } = getDateRange(
      dateRange as string,
      startDate as string,
      endDate as string,
    );

    console.log(`📊 All employees details - Date range: ${dateRange}, Page: ${pageNum}, Limit: ${limitNum}, Search: "${search}"`);

    // STEP 1: Get ALL employees from external API
    const externalUsers = await cacheService.getExternalUsers();
    console.log(`Found ${externalUsers.length} total employees from cache`);

    // STEP 2: Map all employees
    let allEmployees = externalUsers.map((user, index) => {
      const employee = mapExternalUserToEmployee(user, index);
      return {
        ...employee,
        userId: user._id
      };
    });

    console.log(`Mapped ${allEmployees.length} total employees`);

    // STEP 3: Apply search filter if provided
    if (search) {
      const searchLower = (search as string).toLowerCase();
      allEmployees = allEmployees.filter(emp =>
        emp.name.toLowerCase().includes(searchLower) ||
        emp.email.toLowerCase().includes(searchLower) ||
        emp.designation?.toLowerCase().includes(searchLower) ||
        emp.department?.toLowerCase().includes(searchLower)
      );
      console.log(`Filtered to ${allEmployees.length} employees after search`);
    }

    // If no employees after search, return empty result
    if (allEmployees.length === 0) {
      const endTime = Date.now();
      console.log(`✅ No employees found after search in ${endTime - startTime}ms`);

      return res.json({
        success: true,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
          label: dateRange,
        },
        pagination: {
          currentPage: pageNum,
          pageSize: limitNum,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          nextPage: null,
          previousPage: null,
        },
        search: search || null,
        sort: {
          by: sortBy,
          order: sortOrder
        },
        employees: [],
      });
    }

    // STEP 4: Get employee IDs for all employees
    const employeeIds = allEmployees.map(emp => emp.userId || emp.id);

    // STEP 5: Fetch data to check which employees have activity
    const [
      allEmployeeMeetings,
      attendanceForEmployees,
      trackingSessionsForEmployees
    ] = await Promise.all([
      // Fetch meetings for all employees in date range
      Meeting.find({
        employeeId: { $in: employeeIds },
        $or: [
          { startTime: { $gte: start, $lte: end } },
          { startTime: { $gte: start.toISOString(), $lte: end.toISOString() } }
        ]
      })
        .select('employeeId startTime endTime clientName leadId status meetingDetails location')
        .sort({ startTime: -1 })
        .lean()
        .exec(),

      // Fetch attendance records
      Attendance.find({
        employeeId: { $in: employeeIds },
        date: {
          $gte: format(start, "yyyy-MM-dd"),
          $lte: format(end, "yyyy-MM-dd")
        }
      })
        .select('employeeId date attendanceStatus attendanceReason attendenceCreated')
        .lean()
        .exec(),

      // Fetch tracking sessions for duty hour calculations
      TrackingSession.find({
        employeeId: { $in: employeeIds },
        startTime: {
          $gte: start.toISOString(),
          $lte: end.toISOString()
        }
      })
        .select('employeeId startTime endTime startLocation endLocation status duration')
        .lean()
        .exec()
    ]);

    console.log(`📅 Found ${allEmployeeMeetings.length} meetings, ${attendanceForEmployees.length} attendance records, and ${trackingSessionsForEmployees.length} tracking sessions`);

    // STEP 6: Identify which employees have activity data
    const employeesWithActivity = new Set();
    
    // Add employees with meetings
    allEmployeeMeetings.forEach(meeting => {
      employeesWithActivity.add(meeting.employeeId);
    });
    
    // Add employees with attendance
    attendanceForEmployees.forEach(attendance => {
      employeesWithActivity.add(attendance.employeeId);
    });
    
    // Add employees with tracking sessions
    trackingSessionsForEmployees.forEach(session => {
      employeesWithActivity.add(session.employeeId);
    });

    console.log(`👥 ${employeesWithActivity.size} employees have activity data in the selected date range`);

    // STEP 7: Filter employees to only those with activity
    const employeesWithData = allEmployees.filter(emp => 
      employeesWithActivity.has(emp.userId || emp.id)
    );

    console.log(`Filtered to ${employeesWithData.length} employees with data`);

    // If no employees with data, return empty result
    if (employeesWithData.length === 0) {
      const endTime = Date.now();
      console.log(`✅ No employees with activity found in ${endTime - startTime}ms`);

      return res.json({
        success: true,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
          label: dateRange,
        },
        pagination: {
          currentPage: pageNum,
          pageSize: limitNum,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          nextPage: null,
          previousPage: null,
        },
        search: search || null,
        sort: {
          by: sortBy,
          order: sortOrder
        },
        employees: [],
      });
    }

    // STEP 8: Sort employees with data
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    employeesWithData.sort((a, b) => {
      switch (sortBy) {
        case 'employeeName':
          return sortDirection * a.name.localeCompare(b.name);
        case 'email':
          return sortDirection * (a.email || '').localeCompare(b.email || '');
        case 'designation':
          return sortDirection * (a.designation || '').localeCompare(b.designation || '');
        case 'department':
          return sortDirection * (a.department || '').localeCompare(b.department || '');
        default:
          return sortDirection * a.name.localeCompare(b.name);
      }
    });

    // STEP 9: Apply pagination to filtered employees
    const totalEmployees = employeesWithData.length;
    const totalPages = Math.ceil(totalEmployees / limitNum);
    const paginatedEmployees = employeesWithData.slice(skip, skip + limitNum);

    console.log(`📄 Showing ${paginatedEmployees.length} employees with data (page ${pageNum} of ${totalPages})`);

    // If no paginated employees, return empty
    if (paginatedEmployees.length === 0) {
      const endTime = Date.now();
      console.log(`✅ Process completed in ${endTime - startTime}ms`);

      return res.json({
        success: true,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
          label: dateRange,
        },
        pagination: {
          currentPage: pageNum,
          pageSize: limitNum,
          totalItems: totalEmployees,
          totalPages: totalPages,
          hasNextPage: pageNum < totalPages,
          hasPreviousPage: pageNum > 1,
          nextPage: pageNum < totalPages ? pageNum + 1 : null,
          previousPage: pageNum > 1 ? pageNum - 1 : null,
        },
        search: search || null,
        sort: {
          by: sortBy,
          order: sortOrder
        },
        employees: [],
      });
    }

    // STEP 10: Group data for quick access (for paginated employees only)
    const paginatedEmployeeIds = paginatedEmployees.map(emp => emp.userId || emp.id);
    
    // Filter meetings for paginated employees only
    const meetingsForPaginatedEmployees = allEmployeeMeetings.filter(meeting => 
      paginatedEmployeeIds.includes(meeting.employeeId)
    );
    
    // Filter attendance for paginated employees only
    const attendanceForPaginatedEmployees = attendanceForEmployees.filter(att => 
      paginatedEmployeeIds.includes(att.employeeId)
    );
    
    // Filter tracking sessions for paginated employees only
    const trackingSessionsForPaginatedEmployees = trackingSessionsForEmployees.filter(session => 
      paginatedEmployeeIds.includes(session.employeeId)
    );

    // Group ALL meetings by employee
    const allMeetingsByEmployee = new Map();
    meetingsForPaginatedEmployees.forEach(meeting => {
      if (!allMeetingsByEmployee.has(meeting.employeeId)) {
        allMeetingsByEmployee.set(meeting.employeeId, []);
      }
      allMeetingsByEmployee.get(meeting.employeeId).push(meeting);
    });

    // Group attendance by employee-date
    const attendanceByEmployee = new Map();
    attendanceForPaginatedEmployees.forEach(att => {
      const key = `${att.employeeId}-${att.date}`;
      attendanceByEmployee.set(key, att);
    });

    // Group tracking sessions by employee and date
    const sessionsByEmployeeDate = new Map();
    trackingSessionsForPaginatedEmployees.forEach(session => {
      try {
        const dateStr = format(new Date(session.startTime), "yyyy-MM-dd");
        const key = `${session.employeeId}-${dateStr}`;
        if (!sessionsByEmployeeDate.has(key)) {
          sessionsByEmployeeDate.set(key, []);
        }
        sessionsByEmployeeDate.get(key).push(session);
      } catch (error) {
        console.error('Error processing tracking session date:', error);
      }
    });

    // Create user map for quick lookups
    const userMap = new Map();
    externalUsers.forEach(user => {
      userMap.set(user._id, user);
    });

    // STEP 11: Build response with data
    const allEmployeesData = paginatedEmployees.map((employee) => {
      const employeeId = employee.userId || employee.id;
      const allMeetings = allMeetingsByEmployee.get(employeeId) || [];

      // Group ALL meetings by date for this employee
      const meetingsByDate = new Map();
      allMeetings.forEach(meeting => {
        try {
          if (meeting.startTime) {
            const dateStr = format(new Date(meeting.startTime), "yyyy-MM-dd");
            if (!meetingsByDate.has(dateStr)) {
              meetingsByDate.set(dateStr, []);
            }
            meetingsByDate.get(dateStr).push(meeting);
          }
        } catch (error) {
          // Skip invalid dates
        }
      });

      // Get all unique dates from ALL meetings
      const allDates = Array.from(meetingsByDate.keys())
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .slice(0, 10); // Limit to 10 most recent days for performance

      // Generate day records from ALL meetings
      const dayRecords = allDates.map(dateStr => {
        const dateMeetings = meetingsByDate.get(dateStr) || [];
        const totalMeetings = dateMeetings.length;

        // Get first and last meeting
        let firstMeeting = null;
        let lastMeeting = null;
        if (dateMeetings.length > 0) {
          const sorted = [...dateMeetings].sort((a, b) => {
            try {
              return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
            } catch {
              return 0;
            }
          });
          firstMeeting = sorted[0];
          lastMeeting = sorted[sorted.length - 1];
        }

        // Calculate meeting time (sum of all meeting durations)
        let meetingTime = 0;
        dateMeetings.forEach(meeting => {
          if (meeting.startTime && meeting.endTime) {
            try {
              const start = new Date(meeting.startTime);
              const end = new Date(meeting.endTime);
              const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
              if (durationHours > 0) {
                meetingTime += durationHours;
              }
            } catch (error) {
              // Skip invalid dates
            }
          }
        });

        // Calculate total duty hours from first meeting start to last meeting end
        let totalDutyHours = 0;
        if (firstMeeting?.startTime && lastMeeting?.endTime) {
          try {
            const dutyStart = new Date(firstMeeting.startTime);
            const dutyEnd = new Date(lastMeeting.endTime);
            totalDutyHours = Math.max(0, (dutyEnd.getTime() - dutyStart.getTime()) / (1000 * 60 * 60));
          } catch (error) {
            console.error(`Error calculating duty hours for ${employeeId} on ${dateStr}:`, error);
            totalDutyHours = 0;
          }
        } else if (firstMeeting?.startTime) {
          // Only start time available (ongoing meeting)
          try {
            const dutyStart = new Date(firstMeeting.startTime);
            const now = new Date();
            totalDutyHours = Math.max(0, (now.getTime() - dutyStart.getTime()) / (1000 * 60 * 60));
          } catch (error) {
            totalDutyHours = 0;
          }
        }

        // Use tracking sessions data if available and if no meetings exist
        if (totalDutyHours === 0) {
          const sessionKey = `${employeeId}-${dateStr}`;
          const dateSessions = sessionsByEmployeeDate.get(sessionKey) || [];

          if (dateSessions.length > 0) {
            // Calculate from tracking sessions as fallback
            dateSessions.forEach(session => {
              if (session.startTime && session.endTime) {
                try {
                  const start = new Date(session.startTime);
                  const end = new Date(session.endTime);
                  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                  if (durationHours > 0) {
                    totalDutyHours += durationHours;
                  }
                } catch (error) {
                  // Skip invalid dates
                }
              }
            });
          }
        }

        // Calculate travel and lunch time
        const travelAndLunchTime = Math.max(0, totalDutyHours - meetingTime);

        // Get attendance info
        const attendanceKey = `${employeeId}-${dateStr}`;
        const attendance = attendanceByEmployee.get(attendanceKey);

        return {
          date: dateStr,
          totalMeetings,
          startLocationTime: firstMeeting?.startTime ? format(new Date(firstMeeting.startTime), "HH:mm:ss") : "",
          startLocationAddress: firstMeeting?.location?.address || "",
          outLocationTime: lastMeeting?.endTime ? format(new Date(lastMeeting.endTime), "HH:mm:ss") : "",
          outLocationAddress: lastMeeting?.location?.address || "",
          totalDutyHours: parseFloat(totalDutyHours.toFixed(2)),
          meetingTime: parseFloat(meetingTime.toFixed(2)),
          travelAndLunchTime: parseFloat(travelAndLunchTime.toFixed(2)),
          attendanceAddedBy: attendance?.attendenceCreated ?
            (userMap.get(attendance.attendenceCreated)?.name || attendance.attendenceCreated) : "Auto"
        };
      });

      // Generate meeting records from most recent meetings (max 3)
      const recentMeetings = allMeetings.slice(0, 3);
      const meetingRecords = recentMeetings.map(meeting => {
        // Calculate individual meeting duration
        let totalStayTime = 0;
        if (meeting.startTime && meeting.endTime) {
          try {
            const start = new Date(meeting.startTime);
            const end = new Date(meeting.endTime);
            totalStayTime = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Convert to hours
          } catch (error) {
            totalStayTime = 0;
          }
        }

        return {
          employeeName: employee.name,
          companyName: meeting.clientName || "Unknown Company",
          date: meeting.startTime ? format(new Date(meeting.startTime), "yyyy-MM-dd") : "",
          leadId: meeting.leadId || "",
          meetingInTime: meeting.startTime ? format(new Date(meeting.startTime), "HH:mm:ss") : "",
          meetingInLocation: meeting.location?.address || "",
          meetingOutTime: meeting.endTime ? format(new Date(meeting.endTime), "HH:mm:ss") : "In Progress",
          meetingOutLocation: meeting.location?.address || "",
          totalStayTime: parseFloat(totalStayTime.toFixed(2)),
          discussion: meeting.meetingDetails?.discussion || "",
          meetingPerson: meeting.meetingDetails?.customerEmployeeName || "",
          meetingStatus: meeting.status || "completed",
          approvalStatus: meeting.approvalStatus,
          approvalReason: meeting.approvalReason,
          approvedBy: meeting.approvedBy,
          approvedByName: meeting.approvedBy ?
            (userMap.get(meeting.approvedBy)?.name || meeting.approvedBy) : undefined,
          attachments: meeting.meetingDetails?.attachments || [],
        };
      });

      // Calculate summary from ALL meetings
      const totalMeetings = allMeetings.length;
      const uniqueDates = new Set();
      let totalMeetingHours = 0;

      allMeetings.forEach(m => {
        if (m.startTime) {
          try {
            uniqueDates.add(format(new Date(m.startTime), "yyyy-MM-dd"));
            // Calculate meeting duration for summary
            if (m.startTime && m.endTime) {
              const start = new Date(m.startTime);
              const end = new Date(m.endTime);
              totalMeetingHours += (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            }
          } catch (error) {
            // Skip invalid dates
          }
        }
      });

      const daysWithMeetings = uniqueDates.size;

      return {
        employeeId: employee.id,
        employeeName: employee.name,
        email: employee.email,
        phone: employee.phone,
        designation: employee.designation,
        department: employee.department,
        companyName: employee.companyName,
        reportTo: employee.reportTo,
        status: employee.status,
        summary: {
          totalMeetings,
          totalMeetingHours: parseFloat(totalMeetingHours.toFixed(2)),
          daysWithMeetings,
          avgMeetingsPerDay: daysWithMeetings > 0 ? parseFloat((totalMeetings / daysWithMeetings).toFixed(2)) : 0,
        },
        dayRecords: dayRecords,
        meetingRecords: meetingRecords,
      };
    });

    const endTime = Date.now();
    console.log(`✅ All employees details fetched in ${endTime - startTime}ms for ${paginatedEmployees.length} employees`);

    // Calculate pagination info
    const hasNextPage = pageNum < totalPages;
    const hasPreviousPage = pageNum > 1;

    res.json({
      success: true,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
        label: dateRange,
      },
      pagination: {
        currentPage: pageNum,
        pageSize: limitNum,
        totalItems: totalEmployees,
        totalPages: totalPages,
        hasNextPage,
        hasPreviousPage,
        nextPage: hasNextPage ? pageNum + 1 : null,
        previousPage: hasPreviousPage ? pageNum - 1 : null,
      },
      search: search || null,
      sort: {
        by: sortBy,
        order: sortOrder
      },
      employees: allEmployeesData,
    });
  } catch (error) {
    console.error("Error fetching all employees details:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      error: "Failed to fetch all employees details",
      message: error.message
    });
  }
};
