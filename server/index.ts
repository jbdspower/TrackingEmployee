import express from "express";
import cors from "cors";
import path from "path";
import Database from "./config/database";
import { handleDemo } from "./routes/demo";
import {
  getEmployees,
  getEmployee,
  updateEmployeeLocation,
  updateEmployeeStatus,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  refreshEmployeeLocations,
  clearLocationCache,
} from "./routes/employees";
import {
  getMeetings,
  createMeeting,
  updateMeeting,
  getMeeting,
  deleteMeeting,
  uploadMeetingAttachments,
  getActiveMeeting,
  updateMeetingApproval,
  updateMeetingApprovalByDetails,
  getTodaysMeetings,
} from "./routes/meetings";
import {
  getTrackingSessions,
  createTrackingSession,
  updateTrackingSession,
  addLocationToRoute,
  getTrackingSession,
  deleteTrackingSession,
  getMeetingHistory,
  addMeetingToHistory,
  saveIncompleteMeetingRemark,
  getIncompleteMeetingRemark,
} from "./routes/tracking";
import {
  getEmployeeAnalytics,
  getEmployeeDetails,
  getLeadHistory,
  saveAttendance,
  getAttendance,
  getMeetingTrends,
  getAllEmployeesDetails,
} from "./routes/analytics";
import {
  syncAllData,
  getDataStatus,
} from "./routes/data-sync";
import {
  debugEmployeeData,
} from "./routes/debug";
import {
  getRouteSnapshots,
  getRouteSnapshot,
  createRouteSnapshot,
  updateRouteSnapshot,
  deleteRouteSnapshot,
  getEmployeeSnapshots,
} from "./routes/route-snapshots";
import { updateFollowUpStatus, getFollowUpHistory } from "./routes/follow-ups";
import { fileURLToPath } from "url";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createServer() {
  const app = express();

  // Initialize database connection
  const initializeDatabase = async () => {
    try {
      const db = Database.getInstance();
      await db.connect();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      // Continue without database for development
    }
  };

  // Start database connection (non-blocking)
  initializeDatabase();

  // Middleware
  app.use(cors());
  // Increase body size limit to handle file attachments (base64 encoded)
  // 20MB limit allows for ~15MB of base64 data (which is ~11MB of original files)
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Serve uploaded files
  const uploadsPath = path.join(process.cwd(), "uploads");
  app.use("/uploads", express.static(uploadsPath));

  // Request logging
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    console.log("Health check ping received");
    res.json({
      message: "Hello from Express server v2!",
      timestamp: new Date().toISOString(),
      status: "ok",
    });
  });

  app.get("/api/demo", handleDemo);
  
  // Test endpoint for attendance
  app.get("/api/test-attendance", (_req, res) => {
    console.log("Test attendance endpoint hit");
    res.json({
      message: "Attendance route is working!",
      timestamp: new Date().toISOString(),
      status: "ok"
    });
  });

  // Employee routes
  app.get("/api/employees", getEmployees);
  app.post("/api/employees", createEmployee);
  app.get("/api/employees/:id", getEmployee);
  app.put("/api/employees/:id", updateEmployee);
  app.delete("/api/employees/:id", deleteEmployee);
  app.put("/api/employees/:id/location", updateEmployeeLocation);
  app.put("/api/employees/:id/status", updateEmployeeStatus);
  app.post("/api/employees/refresh-locations", refreshEmployeeLocations);
  app.post("/api/employees/clear-cache", clearLocationCache);

  // Meeting routes
  app.get("/api/meetings", getMeetings);
  app.post("/api/meetings", createMeeting);
  app.get("/api/meetings/active", getActiveMeeting); // 🔹 NEW: Get active meeting
  app.get("/api/meetings/today", getTodaysMeetings); // 🔹 NEW: Get today's meetings for duty summary
  app.get("/api/meetings/:id", getMeeting);
  app.put("/api/meetings/:id", updateMeeting);
  app.post("/api/meetings/:id/attachments", uploadMeetingAttachments);
  app.put("/api/meetings/:id/approval", updateMeetingApproval); // Meeting approval by ID
  app.put("/api/meetings/approval-by-details", updateMeetingApprovalByDetails); // Meeting approval by composite key
  app.delete("/api/meetings/:id", deleteMeeting);

  // Tracking session routes
  app.get("/api/tracking-sessions", getTrackingSessions);
  app.post("/api/tracking-sessions", createTrackingSession);
  app.get("/api/tracking-sessions/:id", getTrackingSession);
  app.put("/api/tracking-sessions/:id", updateTrackingSession);
  app.delete("/api/tracking-sessions/:id", deleteTrackingSession);
  app.post("/api/tracking-sessions/:id/location", addLocationToRoute);

  // Meeting history routes
  app.get("/api/meeting-history", getMeetingHistory);
  app.post("/api/meeting-history", addMeetingToHistory);
  app.post("/api/incomplete-meeting-remarks", saveIncompleteMeetingRemark);
  // Expose both paths for backward compatibility and ease-of-use from the client
  app.get("/api/get-incomplete-meeting-remarks", getIncompleteMeetingRemark);
  // Preferred/clean path the frontend should call to fetch incomplete meeting remarks by employeeId
  app.get("/api/incomplete-meeting-remarks", getIncompleteMeetingRemark);

  // Analytics routes
  app.get("/api/analytics/employees", getEmployeeAnalytics);
  app.get("/api/analytics/employee-details/:employeeId", getEmployeeDetails);
  app.get("/api/analytics/all-employees-details", getAllEmployeesDetails); // New endpoint for all employees
  app.get("/api/analytics/lead-history/:leadId", getLeadHistory);
  app.post("/api/analytics/save-attendance", saveAttendance);
  app.get("/api/analytics/attendance", (req, res, next) => {
    console.log("🎯 Attendance route hit!", {
      query: req.query,
      url: req.url,
      method: req.method
    });
    getAttendance(req, res, next);
  });
  app.get("/api/analytics/trends", getMeetingTrends);

  // Data synchronization routes
  app.post("/api/data-sync", syncAllData);
  app.get("/api/data-status", getDataStatus);

  // Debug routes
  app.get("/api/debug/employee/:employeeId", debugEmployeeData);

  // Route snapshot routes
  app.get("/api/route-snapshots", getRouteSnapshots);
  app.post("/api/route-snapshots", createRouteSnapshot);
  app.get("/api/route-snapshots/:id", getRouteSnapshot);
  app.put("/api/route-snapshots/:id", updateRouteSnapshot);
  app.delete("/api/route-snapshots/:id", deleteRouteSnapshot);
  app.get("/api/employees/:employeeId/snapshots", getEmployeeSnapshots);

  // Follow-up meeting routes
  app.get("/api/follow-ups", getFollowUpHistory);
  app.put("/api/follow-ups/:id", updateFollowUpStatus);

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '../spa');
    
    console.log('📦 Serving static files from:', distPath);
    
    // Serve static files
    app.use(express.static(distPath));
    
    // Handle React Router - serve index.html for all non-API routes
    app.get('*', (req, res) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      
      const indexPath = path.join(distPath, 'index.html');
      console.log('📄 Serving index.html for:', req.path);
      res.sendFile(indexPath);
    });
  }

  return app;
}
