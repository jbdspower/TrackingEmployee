import path from "path";
import * as express from "express";
import express__default from "express";
import cors from "cors";
import mongoose, { Schema } from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
import NodeCache from "node-cache";
import { isToday, format, endOfDay, startOfDay, parseISO, endOfMonth, startOfMonth, endOfWeek, startOfWeek, subDays } from "date-fns";
import { fileURLToPath } from "url";
dotenv.config();
const dbConfig = {
  MONGODB_URI: process.env.MONGODB_URI || "mongodb+srv://powerjbds:powerjbds@jbds.hk6xeqm.mongodb.net/",
  DB_NAME: process.env.DB_NAME || "employee-tracking"
};
class Database {
  static instance;
  isConnected = false;
  constructor() {
  }
  static getInstance() {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
  async connect() {
    if (this.isConnected) {
      console.log("📦 Database: Already connected to MongoDB");
      return;
    }
    try {
      console.log("���� Database: Connecting to MongoDB...");
      console.log("📦 Database: URI:", dbConfig.MONGODB_URI);
      await mongoose.connect(dbConfig.MONGODB_URI, {
        dbName: dbConfig.DB_NAME
      });
      this.isConnected = true;
      console.log("✅ Database: Successfully connected to MongoDB");
      mongoose.connection.on("error", (error) => {
        console.error("❌ Database: MongoDB connection error:", error);
        this.isConnected = false;
      });
      mongoose.connection.on("disconnected", () => {
        console.log("📦 Database: MongoDB disconnected");
        this.isConnected = false;
      });
      mongoose.connection.on("reconnected", () => {
        console.log("📦 Database: MongoDB reconnected");
        this.isConnected = true;
      });
    } catch (error) {
      console.error("❌ Database: Failed to connect to MongoDB:", error);
      this.isConnected = false;
      throw error;
    }
  }
  async disconnect() {
    if (!this.isConnected) {
      return;
    }
    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log("📦 Database: Disconnected from MongoDB");
    } catch (error) {
      console.error("❌ Database: Error disconnecting from MongoDB:", error);
    }
  }
  isConnectionActive() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
  getConnection() {
    return mongoose.connection;
  }
}
const handleDemo = (req, res) => {
  const response = {
    message: "Hello from Express server"
  };
  res.status(200).json(response);
};
const CustomerContactSchema$1 = new Schema({
  customerName: { type: String, required: true },
  customerEmployeeName: { type: String, required: true },
  customerEmail: { type: String },
  customerMobile: { type: String },
  customerDesignation: { type: String },
  customerDepartment: { type: String }
});
const MeetingDetailsSchema$1 = new Schema({
  customers: [CustomerContactSchema$1],
  discussion: { type: String, required: true },
  // Legacy fields
  customerName: { type: String },
  customerEmployeeName: { type: String },
  customerEmail: { type: String },
  customerMobile: { type: String },
  customerDesignation: { type: String },
  customerDepartment: { type: String }
});
const CoordinateSchema = new Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, required: true },
  timestamp: { type: String }
}, { _id: false });
const LocationSchema$1 = new Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, required: true },
  endLocation: { type: CoordinateSchema },
  timestamp: { type: String, required: true }
});
const LeadInfoSchema$1 = new Schema({
  id: { type: String, required: true },
  companyName: { type: String, required: true },
  contactName: { type: String, required: true }
});
const MeetingSchema = new Schema({
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  location: {
    type: LocationSchema$1,
    required: true
  },
  startTime: {
    type: String,
    required: true,
    index: true
  },
  endTime: {
    type: String
  },
  clientName: {
    type: String
  },
  notes: {
    type: String
  },
  status: {
    type: String,
    enum: ["started", "in-progress", "completed"],
    default: "in-progress",
    index: true
  },
  trackingSessionId: {
    type: String
  },
  leadId: {
    type: String,
    index: true
  },
  leadInfo: LeadInfoSchema$1,
  followUpId: {
    type: String,
    index: true
  },
  meetingDetails: MeetingDetailsSchema$1,
  externalMeetingStatus: {
    type: String
  }
}, {
  timestamps: true,
  collection: "meetings"
});
MeetingSchema.index({ employeeId: 1, startTime: -1 });
MeetingSchema.index({ leadId: 1, startTime: -1 });
MeetingSchema.index({ status: 1, startTime: -1 });
const Meeting = mongoose.model("Meeting", MeetingSchema);
const CustomerContactSchema = new Schema({
  customerName: { type: String, required: true },
  customerEmployeeName: { type: String, required: true },
  customerEmail: { type: String },
  customerMobile: { type: String },
  customerDesignation: { type: String },
  customerDepartment: { type: String }
});
const MeetingDetailsSchema = new Schema({
  customers: [CustomerContactSchema],
  discussion: { type: String, required: true },
  // Incomplete meeting tracking
  incomplete: { type: Boolean, default: false, index: true },
  incompleteReason: { type: String },
  // Legacy fields
  customerName: { type: String },
  customerEmployeeName: { type: String },
  customerEmail: { type: String },
  customerMobile: { type: String },
  customerDesignation: { type: String },
  customerDepartment: { type: String }
});
const LeadInfoSchema = new Schema({
  id: { type: String, required: true },
  companyName: { type: String, required: true },
  contactName: { type: String, required: true }
});
const MeetingHistorySchema = new Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  meetingDetails: {
    type: MeetingDetailsSchema,
    required: true
  },
  timestamp: {
    type: String,
    required: true,
    index: true
  },
  leadId: {
    type: String,
    index: true
  },
  leadInfo: LeadInfoSchema
}, {
  timestamps: true,
  collection: "meeting_history"
});
MeetingHistorySchema.index({ employeeId: 1, timestamp: -1 });
MeetingHistorySchema.index({ leadId: 1, timestamp: -1 });
MeetingHistorySchema.index({ sessionId: 1, timestamp: -1 });
const MeetingHistory = mongoose.model("MeetingHistory", MeetingHistorySchema);
const AttendanceSchema = new Schema({
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  date: {
    type: String,
    required: true,
    index: true,
    match: /^\d{4}-\d{2}-\d{2}$/
    // YYYY-MM-DD format validation
  },
  attendanceStatus: {
    type: String,
    enum: ["full_day", "half_day", "off", "short_leave", "ot"],
    required: true,
    default: "full_day"
  },
  attendanceReason: {
    type: String,
    default: ""
  },
  attendenceCreated: {
    type: String,
    default: null
    // null for tracking employee, userId from CRM dashboard
  }
}, {
  timestamps: true,
  collection: "attendance"
});
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ employeeId: 1, date: -1 });
AttendanceSchema.index({ date: -1, attendanceStatus: 1 });
const Attendance = mongoose.model("Attendance", AttendanceSchema);
const LocationDataSchema$1 = new Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, required: true },
  timestamp: { type: String, required: true }
});
const TrackingSessionSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  startTime: {
    type: String,
    required: true,
    index: true
  },
  endTime: {
    type: String
  },
  startLocation: {
    type: LocationDataSchema$1,
    required: true
  },
  endLocation: {
    type: LocationDataSchema$1
  },
  route: [LocationDataSchema$1],
  totalDistance: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number
    // Duration in seconds
  },
  status: {
    type: String,
    enum: ["active", "completed", "paused"],
    default: "active",
    index: true
  }
}, {
  timestamps: true,
  collection: "tracking_sessions"
});
TrackingSessionSchema.index({ employeeId: 1, startTime: -1 });
TrackingSessionSchema.index({ status: 1, startTime: -1 });
TrackingSessionSchema.index({ employeeId: 1, status: 1, startTime: -1 });
const TrackingSession = mongoose.model("TrackingSession", TrackingSessionSchema);
const LocationSchema = new Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, required: true },
  timestamp: { type: String, required: true }
});
const EmployeeSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  phone: {
    type: String
  },
  status: {
    type: String,
    enum: ["active", "inactive", "meeting"],
    default: "inactive",
    index: true
  },
  location: LocationSchema,
  lastUpdate: {
    type: String
  },
  currentTask: {
    type: String
  },
  deviceId: {
    type: String,
    index: true
  },
  designation: {
    type: String
  },
  department: {
    type: String
  },
  companyName: {
    type: String
  },
  reportTo: {
    type: String
  }
}, {
  timestamps: true,
  collection: "employees"
});
EmployeeSchema.index({ status: 1, name: 1 });
EmployeeSchema.index({ companyName: 1, department: 1 });
EmployeeSchema.index({ name: "text", email: "text" });
const Employee = mongoose.model("Employee", EmployeeSchema);
const LocationDataSchema = new Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, required: true },
  timestamp: { type: String, required: true }
});
const MeetingSnapshotSchema = new Schema({
  id: { type: String, required: true },
  location: { type: LocationDataSchema, required: true },
  clientName: { type: String },
  startTime: { type: String, required: true },
  endTime: { type: String },
  status: { type: String, required: true }
});
const MapBoundsSchema = new Schema({
  north: { type: Number, required: true },
  south: { type: Number, required: true },
  east: { type: Number, required: true },
  west: { type: Number, required: true }
});
const SnapshotMetadataSchema = new Schema({
  routeColor: { type: String, default: "#3b82f6" },
  mapZoom: { type: Number, default: 12 },
  routePointsCount: { type: Number, default: 0 },
  meetingsCount: { type: Number, default: 0 }
});
const RouteSnapshotSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  employeeName: {
    type: String,
    required: true
  },
  trackingSessionId: {
    type: String,
    index: true
  },
  captureTime: {
    type: String,
    required: true,
    index: true
  },
  startLocation: {
    type: LocationDataSchema,
    required: true
  },
  endLocation: {
    type: LocationDataSchema
  },
  route: [LocationDataSchema],
  meetings: [MeetingSnapshotSchema],
  totalDistance: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number
    // Duration in seconds
  },
  status: {
    type: String,
    enum: ["active", "completed"],
    default: "active",
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  mapBounds: {
    type: MapBoundsSchema,
    required: true
  },
  snapshotMetadata: {
    type: SnapshotMetadataSchema,
    required: true
  }
}, {
  timestamps: true,
  collection: "route_snapshots"
});
RouteSnapshotSchema.index({ employeeId: 1, captureTime: -1 });
RouteSnapshotSchema.index({ trackingSessionId: 1, captureTime: -1 });
RouteSnapshotSchema.index({ status: 1, captureTime: -1 });
RouteSnapshotSchema.index({ employeeId: 1, status: 1, captureTime: -1 });
const RouteSnapshot = mongoose.model("RouteSnapshot", RouteSnapshotSchema);
const EXTERNAL_API_URL$1 = "https://jbdspower.in/LeafNetServer/api/user";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const GEOCACHE_TTL$1 = 60 * 60 * 1e3;
let employeeStatuses$1 = {};
const geocodeCache$2 = /* @__PURE__ */ new Map();
async function getAddressFromCoordinates(lat, lng) {
  if (lat === 0 && lng === 0) return "Location not available";
  const fallbackAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  const cached = geocodeCache$2.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    console.log(`✅ Using cached address for ${lat}, ${lng}: ${cached.address}`);
    return cached.address;
  }
  try {
    console.log(`🗺️ Fetching address for coordinates: ${lat}, ${lng}`);
    const response = await axios.get(NOMINATIM_URL, {
      params: {
        format: "json",
        lat,
        lon: lng,
        zoom: 18,
        addressdetails: 1
      },
      headers: {
        "User-Agent": "EmployeeTrackingApp/1.0"
      },
      timeout: 5e3
      // 5 second timeout
    });
    const address = response.data?.display_name || fallbackAddress;
    console.log(`✅ Address resolved: ${address}`);
    geocodeCache$2.set(cacheKey, {
      address,
      expires: Date.now() + GEOCACHE_TTL$1
    });
    return address;
  } catch (error) {
    console.warn(`⚠️ Geocoding failed for ${lat}, ${lng}, using coordinates:`, error.message);
    return fallbackAddress;
  }
}
async function getEmployeeLatestLocation(employeeId) {
  try {
    const employee = await Promise.race([
      Employee.findOne({ id: employeeId }).lean(),
      new Promise(
        (_, reject) => setTimeout(() => reject(new Error("db timeout")), 500)
      )
    ]);
    if (employee?.location?.lat && employee.location.lng !== 0) {
      const address = employee.location.address || `${employee.location.lat.toFixed(6)}, ${employee.location.lng.toFixed(6)}`;
      return {
        lat: employee.location.lat,
        lng: employee.location.lng,
        address,
        timestamp: employee.location.timestamp,
        lastUpdate: employee.lastUpdate || "Recently updated"
      };
    }
    const latestSession = await Promise.race([
      TrackingSession.findOne({
        employeeId,
        $or: [{ status: "active" }, { status: "completed" }]
      }).sort({ startTime: -1 }).lean(),
      new Promise(
        (_, reject) => setTimeout(() => reject(new Error("db timeout")), 500)
      )
    ]);
    if (latestSession) {
      const latestLocation = latestSession.route?.length ? latestSession.route[latestSession.route.length - 1] : latestSession.startLocation;
      if (latestLocation?.lat !== 0 && latestLocation?.lng !== 0) {
        const address = latestLocation.address || `${latestLocation.lat.toFixed(6)}, ${latestLocation.lng.toFixed(6)}`;
        return {
          lat: latestLocation.lat,
          lng: latestLocation.lng,
          address,
          timestamp: latestLocation.timestamp,
          lastUpdate: latestSession.status === "active" ? "Currently tracking" : "From last session"
        };
      }
    }
    return null;
  } catch (error) {
    console.warn(`Location lookup failed for ${employeeId}:`, error.message);
    return null;
  }
}
async function fetchExternalUsers$1() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15e3);
    const response = await fetch(EXTERNAL_API_URL$1, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    clearTimeout(timeout);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("External API fetch failed:", error);
    return [];
  }
}
async function mapExternalUserToEmployee$1(user, index) {
  const userId = user._id;
  let realLocation = null;
  try {
    realLocation = await Promise.race([
      getEmployeeLatestLocation(userId),
      new Promise(
        (_, reject) => setTimeout(() => reject(new Error("timeout")), 1e3)
      )
    ]);
  } catch (error) {
    realLocation = null;
  }
  if (!employeeStatuses$1[userId]) {
    employeeStatuses$1[userId] = {
      status: index === 1 ? "meeting" : index === 3 ? "inactive" : "active",
      location: realLocation || {
        lat: 28.6139 + (Math.random() - 0.5) * 0.1,
        // Delhi area with variation
        lng: 77.209 + (Math.random() - 0.5) * 0.1,
        address: `Employee ${index + 1} Location`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      },
      lastUpdate: realLocation?.lastUpdate || "Recently",
      currentTask: index === 0 ? "Client meeting" : index === 1 ? "Equipment installation" : void 0
    };
  } else if (realLocation) {
    employeeStatuses$1[userId].location = {
      lat: realLocation.lat,
      lng: realLocation.lng,
      address: realLocation.address,
      timestamp: realLocation.timestamp
    };
    employeeStatuses$1[userId].lastUpdate = realLocation.lastUpdate;
  }
  const status = employeeStatuses$1[userId];
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
    reportTo: user.report?.name
  };
}
const getEmployees = async (req, res) => {
  try {
    if (req.query.clearCache === "true") {
      employeeStatuses$1 = {};
      geocodeCache$2.clear();
    }
    const externalUsers = await fetchExternalUsers$1();
    if (externalUsers.length > 0) {
      const employees = await Promise.all(
        externalUsers.map(
          (user, index) => mapExternalUserToEmployee$1(user, index)
        )
      );
      try {
        await Promise.all(
          employees.map(
            (employee) => Employee.findOneAndUpdate({ id: employee.id }, employee, {
              upsert: true,
              new: true
            })
          )
        );
      } catch (dbError) {
        console.warn("MongoDB sync failed:", dbError);
      }
      return res.json({ employees, total: employees.length });
    }
    try {
      const mongoEmployees = await Employee.find({}).lean();
      return res.json({
        employees: mongoEmployees,
        total: mongoEmployees.length
      });
    } catch (dbError) {
      console.warn("MongoDB fallback failed:", dbError);
      return res.json({ employees: [], total: 0 });
    }
  } catch (error) {
    console.error("Employee fetch failed:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
};
const getEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const externalUsers = await fetchExternalUsers$1();
    if (externalUsers.length > 0) {
      const user = externalUsers.find((u) => u._id === id);
      if (user) {
        const employee = await mapExternalUserToEmployee$1(
          user,
          externalUsers.indexOf(user)
        );
        try {
          await Employee.findOneAndUpdate({ id }, employee, {
            upsert: true,
            new: true
          });
        } catch (dbError) {
          console.warn("MongoDB update failed:", dbError);
        }
        return res.json(employee);
      }
    }
    try {
      const employee = await Employee.findOne({ id }).lean();
      if (employee) return res.json(employee);
    } catch (dbError) {
      console.warn("MongoDB query failed:", dbError);
    }
    return res.status(404).json({ error: "Employee not found" });
  } catch (error) {
    console.error("Employee fetch failed:", error);
    res.status(500).json({ error: "Failed to fetch employee" });
  }
};
const updateEmployeeLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;
    const address = await getAddressFromCoordinates(lat, lng);
    const locationUpdate = {
      location: {
        lat,
        lng,
        address,
        // Now contains human-readable address
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      },
      lastUpdate: "Just now",
      status: "active"
    };
    try {
      const updatedEmployee = await Employee.findOneAndUpdate(
        { id },
        { $set: locationUpdate },
        { new: true }
      );
      if (updatedEmployee) {
        return res.json({ success: true, employee: updatedEmployee });
      }
    } catch (dbError) {
      console.warn("MongoDB update failed:", dbError);
    }
    const externalUsers = await fetchExternalUsers$1();
    const userIndex = externalUsers.findIndex((user) => user._id === id);
    if (userIndex === -1) {
      return res.status(404).json({ error: "Employee not found" });
    }
    employeeStatuses$1[id] = employeeStatuses$1[id] ? { ...employeeStatuses$1[id], ...locationUpdate } : { ...locationUpdate, status: "active", currentTask: void 0 };
    const employee = await mapExternalUserToEmployee$1(
      externalUsers[userIndex],
      userIndex
    );
    res.json({ success: true, employee });
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({ error: "Failed to update location" });
  }
};
const updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, currentTask } = req.body;
    const update = { status, currentTask, lastUpdate: "Just now" };
    try {
      const employee2 = await Employee.findOneAndUpdate(
        { id },
        { $set: update },
        { new: true }
      );
      if (employee2) return res.json(employee2);
    } catch (dbError) {
      console.warn("MongoDB update failed:", dbError);
    }
    const externalUsers = await fetchExternalUsers$1();
    const user = externalUsers.find((u) => u._id === id);
    if (!user) return res.status(404).json({ error: "Employee not found" });
    if (!employeeStatuses$1[id]) {
      const location = await getEmployeeLatestLocation(id);
      employeeStatuses$1[id] = {
        status: "active",
        location: location || {
          lat: 0,
          lng: 0,
          address: "Location not available",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        },
        lastUpdate: location?.lastUpdate || "Location not tracked"
      };
    }
    employeeStatuses$1[id] = { ...employeeStatuses$1[id], ...update };
    const employee = await mapExternalUserToEmployee$1(
      user,
      externalUsers.indexOf(user)
    );
    res.json(employee);
  } catch (error) {
    console.error("Status update failed:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
};
const clearLocationCache = async (req, res) => {
  try {
    employeeStatuses$1 = {};
    geocodeCache$2.clear();
    res.json({ success: true, message: "Cache cleared successfully" });
  } catch (error) {
    console.error("Cache clear failed:", error);
    res.status(500).json({ error: "Failed to clear cache" });
  }
};
const refreshEmployeeLocations = async (req, res) => {
  try {
    employeeStatuses$1 = {};
    const externalUsers = await fetchExternalUsers$1();
    const employees = await Promise.all(
      externalUsers.map(
        (user, index) => mapExternalUserToEmployee$1(user, index)
      )
    );
    try {
      await Promise.all(
        employees.map(
          (employee) => Employee.findOneAndUpdate({ id: employee.id }, employee, {
            upsert: true,
            new: true
          })
        )
      );
    } catch (dbError) {
      console.warn("MongoDB sync failed:", dbError);
    }
    res.json({
      success: true,
      message: `Refreshed ${employees.length} employees`,
      employees
    });
  } catch (error) {
    console.error("Refresh failed:", error);
    res.status(500).json({ error: "Failed to refresh locations" });
  }
};
const createEmployee = (req, res) => res.status(501).json({ error: "Use external API for creation" });
const updateEmployee = (req, res) => res.status(501).json({ error: "Use external API for updates" });
const deleteEmployee = (req, res) => res.status(501).json({ error: "Use external API for deletion" });
const geocodeCache$1 = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
let lastGeocodingTime$1 = 0;
const GEOCODING_DELAY$1 = 1e3;
async function reverseGeocode$1(lat, lng) {
  if (lat === 0 && lng === 0) return "Location not available";
  const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  const cachedAddress = geocodeCache$1.get(cacheKey);
  if (cachedAddress) {
    console.log(`✅ Using cached address for ${lat}, ${lng}: ${cachedAddress}`);
    return cachedAddress;
  }
  try {
    const now = Date.now();
    const timeSinceLastRequest = now - lastGeocodingTime$1;
    if (timeSinceLastRequest < GEOCODING_DELAY$1) {
      const waitTime = GEOCODING_DELAY$1 - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms before geocoding`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    lastGeocodingTime$1 = Date.now();
    console.log(`🗺️ Fetching address for coordinates: ${lat}, ${lng}`);
    const response = await axios.get("https://nominatim.openstreetmap.org/reverse", {
      params: {
        format: "json",
        lat,
        lon: lng,
        zoom: 18,
        addressdetails: 1
      },
      headers: {
        "User-Agent": "EmployeeTrackingApp/1.0"
      },
      timeout: 5e3
    });
    const address = response.data?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    console.log(`✅ Address resolved: ${address}`);
    geocodeCache$1.set(cacheKey, address);
    return address;
  } catch (error) {
    console.error(`⚠️ Reverse geocoding failed for ${lat}, ${lng}:`, error.message);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}
async function convertMeetingToMeetingLog(meeting) {
  const location = meeting.location;
  const address = await reverseGeocode$1(location.lat, location.lng);
  return {
    id: meeting._id.toString(),
    employeeId: meeting.employeeId,
    location: {
      ...location,
      address
      // Use the geocoded address
    },
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    clientName: meeting.clientName,
    notes: meeting.notes,
    status: meeting.status,
    trackingSessionId: meeting.trackingSessionId,
    leadId: meeting.leadId,
    leadInfo: meeting.leadInfo,
    followUpId: meeting.followUpId,
    // 🔹 Include follow-up ID
    meetingDetails: meeting.meetingDetails
  };
}
let inMemoryMeetings = [];
const getMeetings = async (req, res) => {
  try {
    const { employeeId, status, startDate, endDate, limit = 50 } = req.query;
    const query = {};
    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }
    console.log("📥 Fetching meetings with query:", JSON.stringify(query, null, 2));
    try {
      if (employeeId) {
        const totalCount = await Meeting.countDocuments({ employeeId });
        console.log(`📊 Total meetings in DB for employee ${employeeId}:`, totalCount);
      }
      const mongoMeetings = await Meeting.find(query).sort({ startTime: -1 }).limit(parseInt(limit)).lean();
      const meetingLogs = await Promise.all(
        mongoMeetings.map((meeting) => convertMeetingToMeetingLog(meeting))
      );
      const response2 = {
        meetings: meetingLogs,
        total: meetingLogs.length
      };
      console.log(
        `✅ Found ${meetingLogs.length} meetings matching query:`,
        meetingLogs.map((m) => ({ id: m.id, status: m.status, followUpId: m.followUpId, client: m.clientName }))
      );
      if (meetingLogs.length === 0 && employeeId) {
        console.warn("⚠️ No meetings found for query, checking all statuses...");
        const allMeetings2 = await Meeting.find({ employeeId }).lean();
        console.log(
          "📋 All meetings for this employee:",
          allMeetings2.map((m) => ({ id: m._id, status: m.status, followUpId: m.followUpId }))
        );
      }
      res.json(response2);
      return;
    } catch (dbError) {
      console.warn("MongoDB query failed, falling back to in-memory storage:", dbError);
    }
    let filteredMeetings = inMemoryMeetings;
    if (employeeId) {
      filteredMeetings = filteredMeetings.filter(
        (meeting) => meeting.employeeId === employeeId
      );
    }
    if (status) {
      filteredMeetings = filteredMeetings.filter(
        (meeting) => meeting.status === status
      );
    }
    if (startDate) {
      filteredMeetings = filteredMeetings.filter(
        (meeting) => new Date(meeting.startTime) >= new Date(startDate)
      );
    }
    if (endDate) {
      filteredMeetings = filteredMeetings.filter(
        (meeting) => new Date(meeting.startTime) <= new Date(endDate)
      );
    }
    filteredMeetings.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    if (limit) {
      filteredMeetings = filteredMeetings.slice(0, parseInt(limit));
    }
    const response = {
      meetings: filteredMeetings,
      total: filteredMeetings.length
    };
    console.log(`Found ${filteredMeetings.length} meetings in memory`);
    res.json(response);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({ error: "Failed to fetch meetings" });
  }
};
const getMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    try {
      const meeting2 = await Meeting.findById(id).lean();
      if (!meeting2) {
        return res.status(404).json({ error: "Meeting not found in database" });
      }
      const meetingLog = await convertMeetingToMeetingLog(meeting2);
      console.log("Meeting found in MongoDB:", meeting2._id);
      res.json(meetingLog);
      return;
    } catch (dbError) {
      console.warn("MongoDB query failed, falling back to in-memory storage:", dbError);
    }
    const meeting = inMemoryMeetings.find((meeting2) => meeting2.id === id);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    console.log("Meeting found in memory:", meeting.id);
    res.json(meeting);
  } catch (error) {
    console.error("Error fetching meeting:", error);
    res.status(500).json({ error: "Failed to fetch meeting" });
  }
};
const createMeeting = async (req, res) => {
  try {
    const { employeeId, location, clientName, notes, leadId, leadInfo, followUpId, externalMeetingStatus } = req.body;
    if (!employeeId || !location) {
      return res.status(400).json({ error: "Employee ID and location are required" });
    }
    const address = await reverseGeocode$1(location.lat, location.lng);
    const meetingData = {
      employeeId,
      location: {
        ...location,
        address,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      },
      startTime: (/* @__PURE__ */ new Date()).toISOString(),
      clientName,
      notes,
      status: "in-progress",
      leadId: leadId || void 0,
      leadInfo: leadInfo || void 0,
      followUpId: followUpId || void 0,
      // 🔹 Store follow-up meeting ID
      externalMeetingStatus: externalMeetingStatus || void 0
      // 🔹 NEW: Store external meeting status
    };
    try {
      const newMeeting = new Meeting(meetingData);
      const savedMeeting = await newMeeting.save();
      const meetingLog2 = await convertMeetingToMeetingLog(savedMeeting);
      console.log("✅ Meeting saved to MongoDB:", {
        id: savedMeeting._id,
        employeeId: savedMeeting.employeeId,
        followUpId: savedMeeting.followUpId,
        status: savedMeeting.status,
        clientName: savedMeeting.clientName
      });
      try {
        const verification = await Meeting.findById(savedMeeting._id);
        if (verification) {
          console.log("✅ VERIFIED: Meeting exists in database");
          console.log("✅ VERIFIED followUpId:", verification.followUpId);
          console.log("✅ VERIFIED status:", verification.status);
          if (verification.followUpId) {
            const byFollowUpId = await Meeting.findOne({
              followUpId: verification.followUpId,
              status: { $in: ["in-progress", "started"] }
            });
            if (byFollowUpId) {
              console.log("✅ VERIFIED: Can find meeting by followUpId");
            } else {
              console.error("❌ VERIFICATION FAILED: Cannot find meeting by followUpId!");
            }
          }
        } else {
          console.error("❌ VERIFICATION FAILED: Meeting not found after save!");
        }
      } catch (verifyError) {
        console.error("❌ VERIFICATION ERROR:", verifyError);
      }
      res.status(201).json(meetingLog2);
      return;
    } catch (dbError) {
      console.warn("MongoDB save failed, falling back to in-memory storage:", dbError);
    }
    const meetingId = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const meetingLog = {
      id: meetingId,
      employeeId: meetingData.employeeId,
      location: meetingData.location,
      startTime: meetingData.startTime,
      clientName: meetingData.clientName,
      notes: meetingData.notes,
      status: meetingData.status,
      leadId: meetingData.leadId,
      leadInfo: meetingData.leadInfo
    };
    inMemoryMeetings.push(meetingLog);
    console.log("Meeting saved to memory:", meetingId);
    res.status(201).json(meetingLog);
  } catch (error) {
    console.error("Error creating meeting:", error);
    res.status(500).json({ error: "Failed to create meeting" });
  }
};
const updateMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    console.log(`📝 Updating meeting ${id} with status: ${updates.status}`);
    console.log(`📍 End location in request:`, updates.endLocation);
    if (updates.status === "completed" && !updates.endTime) {
      updates.endTime = (/* @__PURE__ */ new Date()).toISOString();
    }
    if (updates.meetingDetails && !updates.meetingDetails.discussion?.trim()) {
      return res.status(400).json({ error: "Discussion details are required" });
    }
    if (updates.status === "completed" && updates.endLocation) {
      console.log("📍 Capturing end location for meeting:", JSON.stringify(updates.endLocation, null, 2));
      updates["location.endLocation"] = {
        lat: updates.endLocation.lat,
        lng: updates.endLocation.lng,
        address: updates.endLocation.address || `${updates.endLocation.lat.toFixed(6)}, ${updates.endLocation.lng.toFixed(6)}`,
        timestamp: updates.endLocation.timestamp || (/* @__PURE__ */ new Date()).toISOString()
      };
      console.log("✅ End location formatted:", JSON.stringify(updates["location.endLocation"], null, 2));
      delete updates.endLocation;
    } else if (updates.status === "completed") {
      console.warn("⚠️ Meeting completed but no endLocation provided in request!");
    }
    try {
      const updatedMeeting = await Meeting.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );
      if (!updatedMeeting) {
        return res.status(404).json({ error: "Meeting not found in database" });
      }
      console.log("Meeting updated in MongoDB:", updatedMeeting._id);
      if (updatedMeeting.location?.endLocation) {
        console.log("✅ End location saved:", updatedMeeting.location.endLocation);
      }
      const meetingLog = await convertMeetingToMeetingLog(updatedMeeting);
      res.json(meetingLog);
      return;
    } catch (dbError) {
      console.warn("MongoDB update failed, falling back to in-memory storage:", dbError);
    }
    const meetingIndex = inMemoryMeetings.findIndex((meeting) => meeting.id === id);
    if (meetingIndex === -1) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    inMemoryMeetings[meetingIndex] = {
      ...inMemoryMeetings[meetingIndex],
      ...updates
    };
    console.log("Meeting updated in memory:", id);
    res.json(inMemoryMeetings[meetingIndex]);
  } catch (error) {
    console.error("Error updating meeting:", error);
    res.status(500).json({ error: "Failed to update meeting" });
  }
};
const deleteMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    try {
      const deletedMeeting = await Meeting.findByIdAndDelete(id);
      if (!deletedMeeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      res.status(204).send();
      return;
    } catch (dbError) {
      console.error("MongoDB delete failed:", dbError);
      throw dbError;
    }
  } catch (error) {
    console.error("Error deleting meeting:", error);
    res.status(500).json({ error: "Failed to delete meeting" });
  }
};
const getActiveMeeting = async (req, res) => {
  try {
    const { employeeId, followUpId } = req.query;
    if (!employeeId && !followUpId) {
      return res.status(400).json({
        error: "Either employeeId or followUpId is required"
      });
    }
    console.log("🔍 Searching for active meeting:", { employeeId, followUpId });
    try {
      const query = {
        status: { $in: ["in-progress", "started"] }
      };
      if (followUpId) {
        query.followUpId = followUpId;
      } else if (employeeId) {
        query.employeeId = employeeId;
      }
      console.log("📥 Query:", JSON.stringify(query, null, 2));
      const activeMeeting = await Meeting.findOne(query).sort({ startTime: -1 }).lean();
      if (!activeMeeting) {
        console.log("⚠️ No active meeting found with query:", JSON.stringify(query, null, 2));
        if (employeeId) {
          const allMeetings2 = await Meeting.find({ employeeId }).lean();
          console.log("📋 All meetings for employee:", allMeetings2.map((m) => ({
            id: m._id,
            status: m.status,
            followUpId: m.followUpId,
            startTime: m.startTime
          })));
        }
        const anyActiveMeetings = await Meeting.find({
          status: { $in: ["in-progress", "started"] }
        }).lean();
        console.log("📋 All active meetings in database:", anyActiveMeetings.map((m) => ({
          id: m._id,
          employeeId: m.employeeId,
          followUpId: m.followUpId,
          status: m.status
        })));
        return res.status(404).json({
          error: "No active meeting found",
          employeeId,
          followUpId,
          debug: {
            totalMeetingsForEmployee: allMeetings?.length || 0,
            totalActiveMeetings: anyActiveMeetings?.length || 0
          }
        });
      }
      const meetingLog = await convertMeetingToMeetingLog(activeMeeting);
      console.log("✅ Active meeting found:", {
        id: meetingLog.id,
        followUpId: meetingLog.followUpId,
        status: meetingLog.status,
        client: meetingLog.clientName
      });
      res.json(meetingLog);
      return;
    } catch (dbError) {
      console.error("MongoDB query failed:", dbError);
      return res.status(500).json({ error: "Database query failed" });
    }
  } catch (error) {
    console.error("Error getting active meeting:", error);
    res.status(500).json({ error: "Failed to get active meeting" });
  }
};
const meetings = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  createMeeting,
  deleteMeeting,
  getActiveMeeting,
  getMeeting,
  getMeetings,
  inMemoryMeetings,
  updateMeeting
}, Symbol.toStringTag, { value: "Module" }));
let lastGeocodingTime = 0;
const GEOCODING_DELAY = 1e3;
const geocodeCache = /* @__PURE__ */ new Map();
const GEOCACHE_TTL = 36e5;
async function reverseGeocode(lat, lng) {
  if (lat === 0 && lng === 0) return "Location not available";
  const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    console.log(`✅ Using cached address for ${lat}, ${lng}: ${cached.address}`);
    return cached.address;
  }
  try {
    const now = Date.now();
    const timeSinceLastRequest = now - lastGeocodingTime;
    if (timeSinceLastRequest < GEOCODING_DELAY) {
      const waitTime = GEOCODING_DELAY - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms before geocoding`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    lastGeocodingTime = Date.now();
    console.log(`🗺️ Fetching address for coordinates: ${lat}, ${lng}`);
    const response = await axios.get("https://nominatim.openstreetmap.org/reverse", {
      params: {
        format: "json",
        lat,
        lon: lng,
        zoom: 18,
        addressdetails: 1
      },
      headers: {
        "User-Agent": "EmployeeTrackingApp/1.0"
      },
      timeout: 5e3
    });
    const address = response.data?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    console.log(`✅ Address resolved: ${address}`);
    geocodeCache.set(cacheKey, {
      address,
      expires: Date.now() + GEOCACHE_TTL
    });
    return address;
  } catch (error) {
    console.error(`⚠️ Reverse geocoding failed for ${lat}, ${lng}:`, error.message);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}
let trackingSessions = [];
let sessionIdCounter = 1;
let meetingHistory = [];
let historyIdCounter = 1;
const getTrackingSessions = async (req, res) => {
  try {
    const { employeeId, status, startDate, endDate, limit = 50 } = req.query;
    const query = {};
    if (employeeId) {
      query.employeeId = employeeId;
    }
    if (status) {
      query.status = status;
    }
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) {
        query.startTime.$gte = new Date(startDate).toISOString();
      }
      if (endDate) {
        query.startTime.$lte = new Date(endDate).toISOString();
      }
    }
    console.log("Fetching tracking sessions with query:", query);
    try {
      const mongoSessions = await TrackingSession.find(query).sort({ startTime: -1 }).limit(parseInt(limit)).lean();
      const response2 = {
        sessions: mongoSessions,
        total: mongoSessions.length
      };
      console.log(`Found ${mongoSessions.length} tracking sessions in MongoDB`);
      res.json(response2);
      return;
    } catch (dbError) {
      console.warn("MongoDB query failed, falling back to in-memory storage:", dbError);
    }
    let filteredSessions = trackingSessions;
    if (employeeId) {
      filteredSessions = filteredSessions.filter(
        (session) => session.employeeId === employeeId
      );
    }
    if (status) {
      filteredSessions = filteredSessions.filter(
        (session) => session.status === status
      );
    }
    if (startDate) {
      filteredSessions = filteredSessions.filter(
        (session) => new Date(session.startTime) >= new Date(startDate)
      );
    }
    if (endDate) {
      filteredSessions = filteredSessions.filter(
        (session) => new Date(session.startTime) <= new Date(endDate)
      );
    }
    filteredSessions.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    if (limit) {
      filteredSessions = filteredSessions.slice(0, parseInt(limit));
    }
    const response = {
      sessions: filteredSessions,
      total: filteredSessions.length
    };
    console.log(`Found ${filteredSessions.length} tracking sessions in memory`);
    res.json(response);
  } catch (error) {
    console.error("Error fetching tracking sessions:", error);
    res.status(500).json({ error: "Failed to fetch tracking sessions" });
  }
};
const createTrackingSession = async (req, res) => {
  try {
    const { id, employeeId, startTime, startLocation, route, totalDistance, status } = req.body;
    if (!employeeId || !startLocation) {
      return res.status(400).json({
        error: "Employee ID and start location are required"
      });
    }
    console.log("📍 Creating tracking session:", { id, employeeId, startTime });
    let resolvedStartLocation = { ...startLocation };
    if (startLocation.lat && startLocation.lng) {
      try {
        console.log("🗺️ Resolving start location address...");
        const address = await reverseGeocode(startLocation.lat, startLocation.lng);
        resolvedStartLocation.address = address;
        console.log("✅ Start location address resolved:", address);
      } catch (error) {
        console.warn("⚠️ Failed to resolve start location address:", error);
      }
    }
    const sessionData = {
      id: id || `session_${String(sessionIdCounter++).padStart(3, "0")}`,
      employeeId,
      startTime: startTime || (/* @__PURE__ */ new Date()).toISOString(),
      startLocation: {
        ...resolvedStartLocation,
        timestamp: resolvedStartLocation.timestamp || (/* @__PURE__ */ new Date()).toISOString()
      },
      route: route || [resolvedStartLocation],
      totalDistance: totalDistance || 0,
      status: status || "active"
    };
    try {
      const newSession2 = new TrackingSession(sessionData);
      const savedSession = await newSession2.save();
      console.log("Tracking session saved to MongoDB:", savedSession.id);
      res.status(201).json(savedSession);
      return;
    } catch (dbError) {
      console.warn("MongoDB save failed, falling back to in-memory storage:", dbError);
    }
    const newSession = sessionData;
    trackingSessions.push(newSession);
    console.log("Tracking session saved to memory:", newSession.id);
    res.status(201).json(newSession);
  } catch (error) {
    console.error("Error creating tracking session:", error);
    res.status(500).json({ error: "Failed to create tracking session" });
  }
};
const updateTrackingSession = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    console.log("📍 Updating tracking session:", id);
    console.log("📍 Updates:", JSON.stringify(updates, null, 2));
    if (updates.status === "completed" && !updates.endTime) {
      updates.endTime = (/* @__PURE__ */ new Date()).toISOString();
    }
    if (updates.endLocation && updates.endLocation.lat && updates.endLocation.lng) {
      try {
        console.log("🗺️ Resolving end location address...");
        const address = await reverseGeocode(updates.endLocation.lat, updates.endLocation.lng);
        updates.endLocation.address = address;
        console.log("✅ End location address resolved:", address);
      } catch (error) {
        console.warn("⚠️ Failed to resolve end location address:", error);
      }
    }
    try {
      const updatedSession = await TrackingSession.findOneAndUpdate(
        { id },
        { $set: updates },
        { new: true, runValidators: true }
      );
      if (!updatedSession) {
        console.warn("⚠️ Tracking session not found in database:", id);
        return res.status(404).json({ error: "Tracking session not found in database" });
      }
      if (updates.status === "completed" && updatedSession.startTime && updatedSession.endTime) {
        const startTime = new Date(updatedSession.startTime).getTime();
        const endTime = new Date(updatedSession.endTime).getTime();
        const duration = Math.floor((endTime - startTime) / 1e3);
        await TrackingSession.findOneAndUpdate(
          { id },
          { $set: { duration } },
          { new: true }
        );
        updatedSession.duration = duration;
        console.log("✅ Duration calculated:", duration, "seconds");
      }
      console.log("✅ Tracking session updated in MongoDB:", updatedSession.id);
      if (updatedSession.endLocation) {
        console.log("✅ End location saved:", updatedSession.endLocation);
      }
      res.json(updatedSession);
      return;
    } catch (dbError) {
      console.warn("MongoDB update failed, falling back to in-memory storage:", dbError);
    }
    const sessionIndex = trackingSessions.findIndex(
      (session) => session.id === id
    );
    if (sessionIndex === -1) {
      return res.status(404).json({ error: "Tracking session not found" });
    }
    if (updates.status === "completed" && !trackingSessions[sessionIndex].endTime) {
      const startTime = new Date(trackingSessions[sessionIndex].startTime).getTime();
      const endTime = new Date(updates.endTime).getTime();
      updates.duration = Math.floor((endTime - startTime) / 1e3);
    }
    trackingSessions[sessionIndex] = {
      ...trackingSessions[sessionIndex],
      ...updates
    };
    console.log("Tracking session updated in memory:", trackingSessions[sessionIndex].id);
    res.json(trackingSessions[sessionIndex]);
  } catch (error) {
    console.error("Error updating tracking session:", error);
    res.status(500).json({ error: "Failed to update tracking session" });
  }
};
const addLocationToRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const { location } = req.body;
    if (!location) {
      return res.status(400).json({ error: "Location is required" });
    }
    const locationWithTimestamp = {
      ...location,
      timestamp: location.timestamp || (/* @__PURE__ */ new Date()).toISOString()
    };
    try {
      const session2 = await TrackingSession.findOne({ id });
      if (!session2) {
        return res.status(404).json({ error: "Tracking session not found in database" });
      }
      session2.route.push(locationWithTimestamp);
      if (session2.route.length > 1) {
        const prevLocation = session2.route[session2.route.length - 2];
        const distance = calculateDistance(
          prevLocation.lat,
          prevLocation.lng,
          location.lat,
          location.lng
        );
        session2.totalDistance += distance;
      }
      await session2.save();
      console.log("Location added to route in MongoDB:", session2.id);
      res.json(session2);
      return;
    } catch (dbError) {
      console.warn("MongoDB update failed, falling back to in-memory storage:", dbError);
    }
    const sessionIndex = trackingSessions.findIndex(
      (session2) => session2.id === id
    );
    if (sessionIndex === -1) {
      return res.status(404).json({ error: "Tracking session not found" });
    }
    const session = trackingSessions[sessionIndex];
    session.route.push(locationWithTimestamp);
    if (session.route.length > 1) {
      const prevLocation = session.route[session.route.length - 2];
      const distance = calculateDistance(
        prevLocation.lat,
        prevLocation.lng,
        location.lat,
        location.lng
      );
      session.totalDistance += distance;
    }
    console.log("Location added to route in memory:", session.id);
    res.json(session);
  } catch (error) {
    console.error("Error adding location to route:", error);
    res.status(500).json({ error: "Failed to add location to route" });
  }
};
const getTrackingSession = async (req, res) => {
  try {
    const { id } = req.params;
    try {
      const session2 = await TrackingSession.findOne({ id });
      if (session2) {
        console.log("Tracking session found in MongoDB:", session2.id);
        res.json(session2);
        return;
      }
    } catch (dbError) {
      console.warn("MongoDB query failed, falling back to in-memory storage:", dbError);
    }
    const session = trackingSessions.find((session2) => session2.id === id);
    if (!session) {
      return res.status(404).json({ error: "Tracking session not found" });
    }
    console.log("Tracking session found in memory:", session.id);
    res.json(session);
  } catch (error) {
    console.error("Error fetching tracking session:", error);
    res.status(500).json({ error: "Failed to fetch tracking session" });
  }
};
const deleteTrackingSession = (req, res) => {
  try {
    const { id } = req.params;
    const sessionIndex = trackingSessions.findIndex(
      (session) => session.id === id
    );
    if (sessionIndex === -1) {
      return res.status(404).json({ error: "Tracking session not found" });
    }
    trackingSessions.splice(sessionIndex, 1);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting tracking session:", error);
    res.status(500).json({ error: "Failed to delete tracking session" });
  }
};
const getMeetingHistory = async (req, res) => {
  try {
    const { employeeId, page = 1, limit = 50, dateRange, startDate, endDate, leadId } = req.query;
    const query = {};
    if (employeeId) {
      query.employeeId = employeeId;
    }
    if (leadId) {
      query.leadId = leadId;
    }
    if (dateRange || startDate || endDate) {
      const now = /* @__PURE__ */ new Date();
      let start, end;
      if (dateRange && dateRange !== "custom") {
        switch (dateRange) {
          case "all":
            break;
          case "today":
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
          case "yesterday":
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1e3);
            start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
            end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
            break;
          case "week":
            const startOfWeek2 = new Date(now.getTime() - (now.getDay() || 7) * 24 * 60 * 60 * 1e3);
            start = new Date(startOfWeek2.getFullYear(), startOfWeek2.getMonth(), startOfWeek2.getDate());
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
          case "month":
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            break;
        }
      } else if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      }
      if (start && end) {
        query.timestamp = {
          $gte: start.toISOString(),
          $lte: end.toISOString()
        };
        console.log(`Meeting history date filter: ${start.toISOString()} to ${end.toISOString()}`);
      }
    }
    console.log("=== MEETING HISTORY REQUEST ===");
    console.log("Meeting history params:", { employeeId, leadId, dateRange, startDate, endDate });
    console.log("Built MongoDB query:", JSON.stringify(query, null, 2));
    if (!employeeId && dateRange === "all") {
      try {
        const totalMeetings = await MeetingHistory.countDocuments();
        const uniqueEmployeeIds = await MeetingHistory.distinct("employeeId");
        const uniqueLeadIds = await MeetingHistory.distinct("leadId");
        console.log("=== DATABASE DEBUG INFO ===");
        console.log(`Total meetings in database: ${totalMeetings}`);
        console.log(`Unique employee IDs (${uniqueEmployeeIds.length}):`, uniqueEmployeeIds);
        console.log(`Unique lead IDs (${uniqueLeadIds.filter((id) => id).length}):`, uniqueLeadIds.filter((id) => id));
        const specificLeads = await MeetingHistory.find({
          leadId: { $in: ["JBDSL-0044", "JBDSL-0001"] }
        }).lean();
        console.log(`Meetings with JBDSL-0044 or JBDSL-0001: ${specificLeads.length}`);
        specificLeads.forEach((meeting) => {
          console.log(`  - Lead: ${meeting.leadId}, Employee: ${meeting.employeeId}, Customer: ${meeting.meetingDetails?.customerName || meeting.meetingDetails?.customers?.[0]?.customerName}`);
        });
      } catch (debugError) {
        console.log("Debug info failed:", debugError.message);
      }
    }
    try {
      const pageNum2 = parseInt(page);
      const limitNum2 = parseInt(limit);
      const skip = (pageNum2 - 1) * limitNum2;
      const mongoHistory = await MeetingHistory.find(query).sort({ timestamp: -1 }).skip(skip).limit(limitNum2).lean();
      const total = await MeetingHistory.countDocuments(query);
      const response2 = {
        meetings: mongoHistory,
        total,
        page: pageNum2,
        totalPages: Math.ceil(total / limitNum2)
      };
      console.log(`Found ${mongoHistory.length} meeting history entries in MongoDB for employeeId: ${employeeId}`);
      if (mongoHistory.length > 0) {
        console.log("Sample meeting data:", {
          firstMeeting: {
            employeeId: mongoHistory[0].employeeId,
            leadId: mongoHistory[0].leadId,
            customerName: mongoHistory[0].meetingDetails?.customerName,
            timestamp: mongoHistory[0].timestamp
          }
        });
        const uniqueEmployeeIds = [...new Set(mongoHistory.map((m) => m.employeeId))];
        console.log("All employee IDs in results:", uniqueEmployeeIds);
      }
      res.json(response2);
      return;
    } catch (dbError) {
      console.warn("MongoDB query failed, falling back to in-memory storage:", dbError);
    }
    let filteredHistory = meetingHistory;
    if (employeeId) {
      filteredHistory = filteredHistory.filter(
        (history) => history.employeeId === employeeId
      );
    }
    if (leadId) {
      filteredHistory = filteredHistory.filter(
        (history) => history.leadId === leadId
      );
    }
    filteredHistory.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedHistory = filteredHistory.slice(startIndex, endIndex);
    const response = {
      meetings: paginatedHistory,
      total: filteredHistory.length,
      page: pageNum,
      totalPages: Math.ceil(filteredHistory.length / limitNum)
    };
    console.log(`Found ${paginatedHistory.length} meeting history entries in memory`);
    res.json(response);
  } catch (error) {
    console.error("Error fetching meeting history:", error);
    res.status(500).json({ error: "Failed to fetch meeting history" });
  }
};
const addMeetingToHistory = async (req, res) => {
  try {
    const { sessionId, employeeId, meetingDetails, leadId, leadInfo } = req.body;
    console.log("Adding meeting to history:", {
      sessionId,
      employeeId,
      meetingDetails,
      leadId,
      leadInfo
    });
    if (!sessionId || !employeeId || !meetingDetails) {
      return res.status(400).json({
        error: "Session ID, employee ID, and meeting details are required"
      });
    }
    if (!meetingDetails.discussion || !meetingDetails.discussion.trim()) {
      return res.status(400).json({
        error: "Discussion details are required"
      });
    }
    if (!meetingDetails.customers || meetingDetails.customers.length === 0) {
      if (!meetingDetails.customerName || !meetingDetails.customerEmployeeName) {
        return res.status(400).json({
          error: "At least one customer contact is required"
        });
      }
      meetingDetails.customers = [{
        customerName: meetingDetails.customerName,
        customerEmployeeName: meetingDetails.customerEmployeeName,
        customerEmail: meetingDetails.customerEmail || "",
        customerMobile: meetingDetails.customerMobile || "",
        customerDesignation: meetingDetails.customerDesignation || "",
        customerDepartment: meetingDetails.customerDepartment || ""
      }];
    }
    const historyData = {
      sessionId,
      employeeId,
      meetingDetails,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      leadId: leadId || void 0,
      leadInfo: leadInfo || void 0
    };
    try {
      const newHistoryEntry2 = new MeetingHistory(historyData);
      const savedHistory = await newHistoryEntry2.save();
      console.log("Meeting history saved to MongoDB:", savedHistory._id);
      const formattedResponse = {
        id: savedHistory._id.toString(),
        sessionId: savedHistory.sessionId,
        employeeId: savedHistory.employeeId,
        meetingDetails: savedHistory.meetingDetails,
        timestamp: savedHistory.timestamp,
        leadId: savedHistory.leadId,
        leadInfo: savedHistory.leadInfo,
        _id: savedHistory._id,
        createdAt: savedHistory.createdAt,
        updatedAt: savedHistory.updatedAt
      };
      res.status(201).json(formattedResponse);
      return;
    } catch (dbError) {
      console.warn("MongoDB save failed, falling back to in-memory storage:", dbError);
      console.error("MongoDB error details:", {
        message: dbError.message,
        stack: dbError.stack,
        data: historyData
      });
    }
    const newHistoryEntry = {
      id: `history_${String(historyIdCounter++).padStart(3, "0")}`,
      ...historyData
    };
    meetingHistory.push(newHistoryEntry);
    console.log("Meeting history entry added to memory:", newHistoryEntry);
    console.log("Total meeting history entries:", meetingHistory.length);
    res.status(201).json(newHistoryEntry);
  } catch (error) {
    console.error("Error adding meeting to history:", error);
    res.status(500).json({ error: "Failed to add meeting to history" });
  }
};
const saveIncompleteMeetingRemark = async (req, res) => {
  try {
    const { employeeId, reason, pendingMeetings } = req.body;
    if (!employeeId || !pendingMeetings || pendingMeetings.length === 0) {
      return res.status(400).json({
        error: "Employee ID and at least one pending meeting are required"
      });
    }
    console.log("=== SAVING INCOMPLETE MEETING REMARKS ===");
    console.log("Employee ID:", employeeId, "Type:", typeof employeeId);
    console.log("General reason:", reason);
    console.log("Pending meetings count:", pendingMeetings.length);
    const savedEntries = await Promise.all(
      pendingMeetings.map(async (meeting, idx) => {
        const meetingReason = meeting.incompleteReason || reason || "Meeting not completed";
        const meetingDetails = {
          discussion: meetingReason,
          incomplete: true,
          incompleteReason: meetingReason,
          customers: [
            {
              customerName: meeting.customerName || "",
              customerEmployeeName: meeting.customerName || "",
              customerEmail: meeting.customerEmail || "",
              customerMobile: meeting.customerMobile || "",
              customerDesignation: meeting.customerDesignation || "",
              customerDepartment: ""
            }
          ]
        };
        const historyData = {
          sessionId: `logout_incomplete_${Date.now()}_${idx}`,
          employeeId: String(employeeId),
          // Ensure it's a string
          meetingDetails,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          leadId: meeting.leadId,
          leadInfo: {
            id: meeting.leadId,
            companyName: meeting.companyName
          }
        };
        console.log(`Processing meeting ${idx + 1}:`, {
          employeeId: historyData.employeeId,
          companyName: meeting.companyName,
          customerName: meeting.customerName,
          leadId: meeting.leadId,
          reason: meetingReason
        });
        try {
          const newEntry = new MeetingHistory(historyData);
          const saved = await newEntry.save();
          console.log("✓ Incomplete meeting remark saved to MongoDB:", saved._id);
          console.log("  - Company:", meeting.companyName);
          console.log("  - Saved employeeId:", saved.employeeId);
          console.log("  - Saved incomplete flag:", saved.meetingDetails?.incomplete);
          console.log("  - Reason:", meetingReason);
          return {
            success: true,
            meetingId: meeting._id,
            historyId: saved._id,
            companyName: meeting.companyName,
            reason: meetingReason
          };
        } catch (dbError) {
          console.warn("MongoDB save failed for incomplete meeting remark:", dbError);
          meetingHistory.push({
            id: `history_${String(historyIdCounter++).padStart(3, "0")}`,
            ...historyData
          });
          console.log("✓ Incomplete meeting remark saved to in-memory storage");
          return {
            success: true,
            meetingId: meeting._id,
            companyName: meeting.companyName,
            reason: meetingReason
          };
        }
      })
    );
    console.log("=== SAVED INCOMPLETE MEETING REMARKS ===");
    console.log("Total entries saved:", savedEntries.length);
    savedEntries.forEach((entry, idx) => {
      console.log(`  ${idx + 1}. ${entry.companyName}: ${entry.reason}`);
    });
    res.status(201).json({
      success: true,
      reason,
      meetingsProcessed: savedEntries.length,
      entries: savedEntries
    });
  } catch (error) {
    console.error("Error saving incomplete meeting remarks:", error);
    res.status(500).json({ error: "Failed to save incomplete meeting remarks" });
  }
};
const getIncompleteMeetingRemark = async (req, res) => {
  try {
    const { employeeId } = req.query;
    if (!employeeId) {
      return res.status(400).json({
        error: "Employee ID is required"
      });
    }
    console.log("Fetching incomplete meeting remarks for employee:", employeeId);
    console.log("Query filter - employeeId type:", typeof employeeId, "value:", employeeId);
    try {
      const query = {
        employeeId: String(employeeId),
        "meetingDetails.incomplete": true
      };
      console.log("MongoDB query:", JSON.stringify(query, null, 2));
      const incompleteMeetings2 = await MeetingHistory.find(query).lean();
      console.log(`Found ${incompleteMeetings2.length} incomplete meeting remarks in MongoDB`);
      const allIncomplete = await MeetingHistory.find({
        "meetingDetails.incomplete": true
      }).lean();
      console.log(`Total incomplete meetings in DB (all employees): ${allIncomplete.length}`);
      res.json({ meetings: incompleteMeetings2 });
      return;
    } catch (dbError) {
      console.warn("MongoDB query failed, falling back to in-memory storage:", dbError);
    }
    const incompleteMeetings = meetingHistory.filter(
      (history) => String(history.employeeId) === String(employeeId) && history.meetingDetails.incomplete
    );
    console.log(`Found ${incompleteMeetings.length} incomplete meeting remarks in memory`);
    res.json({ meetings: incompleteMeetings });
  } catch (error) {
    console.error("Error fetching incomplete meeting remarks:", error);
    res.status(500).json({ error: "Failed to fetch incomplete meeting remarks" });
  }
};
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng1 - lng2) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
const EXTERNAL_API_URL = "https://jbdspower.in/LeafNetServer/api/user";
async function fetchExternalUsers() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3e4);
    const response = await fetch(EXTERNAL_API_URL, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const users = await response.json();
    console.log(
      `External API response: { count: ${users.length}, sample: ${JSON.stringify(users[0] || {}, null, 2)} }`
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
let employeeStatuses = {};
function getRealisticIndianLocation(index) {
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
    { lat: 18.5204, lng: 73.8567, address: "Pune, Maharashtra" }
  ];
  return locations[index % locations.length];
}
function mapExternalUserToEmployee(user, index) {
  const userId = user._id;
  if (!employeeStatuses[userId]) {
    const realisticLocation = getRealisticIndianLocation(index);
    employeeStatuses[userId] = {
      status: index === 1 ? "meeting" : index === 3 ? "inactive" : "active",
      location: {
        ...realisticLocation,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      },
      lastUpdate: `${Math.floor(Math.random() * 15) + 1} minutes ago`,
      currentTask: index === 0 ? "Client meeting" : index === 1 ? "Equipment installation" : void 0
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
    reportTo: user.report?.name
  };
}
function getDateRange(dateRange, startDate, endDate) {
  const now = /* @__PURE__ */ new Date();
  switch (dateRange) {
    case "all":
      return {
        start: /* @__PURE__ */ new Date("2020-01-01"),
        // Far past date
        end: /* @__PURE__ */ new Date("2030-12-31")
        // Far future date
      };
    case "today":
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      };
    case "yesterday":
      const yesterday = subDays(now, 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday)
      };
    case "week":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        // Monday
        end: endOfWeek(now, { weekStartsOn: 1 })
      };
    case "month":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
    case "custom":
      if (startDate && endDate) {
        return {
          start: startOfDay(parseISO(startDate)),
          end: endOfDay(parseISO(endDate))
        };
      }
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      };
    default:
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      };
  }
}
function calculateMeetingDuration(startTime, endTime) {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : /* @__PURE__ */ new Date();
  const durationMs = end.getTime() - start.getTime();
  return durationMs / (1e3 * 60 * 60);
}
function calculateDutyHours(employeeId, dateRange) {
  const daysInRange = Math.ceil(
    (dateRange.end.getTime() - dateRange.start.getTime()) / (1e3 * 60 * 60 * 24)
  );
  return Math.min(daysInRange * 8, 40);
}
const getEmployeeAnalytics = async (req, res) => {
  try {
    const {
      employeeId,
      dateRange = "today",
      startDate,
      endDate,
      search
    } = req.query;
    const { start, end } = getDateRange(
      dateRange,
      startDate,
      endDate
    );
    console.log(`Analytics date filter - Range: ${dateRange}, Start: ${startDate}, End: ${endDate}`);
    console.log(`Calculated date range: ${start.toISOString()} to ${end.toISOString()}`);
    const externalUsers = await fetchExternalUsers();
    let employees = externalUsers.map(
      (user, index) => mapExternalUserToEmployee(user, index)
    );
    if (employeeId && employeeId !== "all") {
      employees = employees.filter((emp) => emp.id === employeeId);
    }
    if (search) {
      const searchTerm = search.toLowerCase();
      employees = employees.filter(
        (emp) => emp.name.toLowerCase().includes(searchTerm) || emp.email.toLowerCase().includes(searchTerm)
      );
    }
    let actualMeetings = [];
    try {
      const mongoMeetings = await Meeting.find({}).lean();
      actualMeetings = mongoMeetings.map((meeting) => ({
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
      if (actualMeetings.length === 0) {
        const { inMemoryMeetings: inMemoryMeetings2 } = await Promise.resolve().then(() => meetings);
        actualMeetings = inMemoryMeetings2 || [];
        console.log(`Fallback: Using ${actualMeetings.length} meetings from memory`);
      }
    } catch (dbError) {
      console.warn("MongoDB query failed, falling back to in-memory meetings:", dbError);
      const { inMemoryMeetings: inMemoryMeetings2 } = await Promise.resolve().then(() => meetings);
      actualMeetings = inMemoryMeetings2 || [];
    }
    console.log("Using meetings data:", actualMeetings.length, "meetings");
    console.log("Available employees:", employees.map((e) => ({ id: e.id, name: e.name })));
    console.log("Meeting employee IDs:", actualMeetings.map((m) => m.employeeId));
    const analytics = employees.map((employee) => {
      const employeeMeetings = actualMeetings.filter(
        (meeting) => meeting.employeeId === employee.id
      );
      console.log(`Employee ${employee.name} (${employee.id}): found ${employeeMeetings.length} meetings`);
      const meetingsInRange = employeeMeetings.filter((meeting) => {
        const meetingDate = new Date(meeting.startTime);
        const meetingTime = meetingDate.getTime();
        const startTime = start.getTime();
        const endTime = end.getTime();
        const inRange = meetingTime >= startTime && meetingTime <= endTime;
        if (inRange) {
          console.log(`✅ Meeting ${meeting.id} IN range: ${meeting.startTime} (${meeting.clientName || "No client"})`);
        } else {
          console.log(`❌ Meeting ${meeting.id} OUT of range: ${meeting.startTime} (not between ${start.toISOString()} and ${end.toISOString()})`);
        }
        return inRange;
      });
      const todayMeetings = employeeMeetings.filter(
        (meeting) => isToday(new Date(meeting.startTime))
      ).length;
      const totalMeetingHours = meetingsInRange.reduce((total, meeting) => {
        return total + calculateMeetingDuration(meeting.startTime, meeting.endTime);
      }, 0);
      console.log(`Employee ${employee.name} (${employee.id}): ${employeeMeetings.length} total meetings, ${meetingsInRange.length} in date range (${dateRange}), ${totalMeetingHours.toFixed(1)}h meeting time`);
      const totalDutyHours = calculateDutyHours(employee.id, { start, end });
      return {
        employeeId: employee.id,
        employeeName: employee.name,
        totalMeetings: employeeMeetings.length,
        // Total meetings for this employee (all time, never filtered)
        todayMeetings,
        totalMeetingHours,
        // This uses filtered range which is correct
        totalDutyHours,
        status: employee.status
      };
    });
    const summary = {
      totalEmployees: employees.length,
      activeMeetings: employees.filter((emp) => emp.status === "meeting").length,
      totalMeetingsToday: analytics.reduce(
        (sum, emp) => sum + emp.todayMeetings,
        0
      ),
      avgMeetingDuration: analytics.length > 0 ? analytics.reduce((sum, emp) => sum + emp.totalMeetingHours, 0) / Math.max(
        analytics.reduce((sum, emp) => sum + emp.totalMeetings, 0),
        1
      ) : 0
    };
    res.json({
      analytics,
      summary,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
        label: dateRange
      }
    });
  } catch (error) {
    console.error("Error fetching employee analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};
const getEmployeeDetails = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { dateRange = "today", startDate, endDate } = req.query;
    const { start, end } = getDateRange(
      dateRange,
      startDate,
      endDate
    );
    console.log(`Employee details date filter - Range: ${dateRange}, Start: ${startDate}, End: ${endDate}`);
    console.log(`Employee ${employeeId} calculated date range: ${start.toISOString()} to ${end.toISOString()}`);
    let actualMeetings = [];
    try {
      const mongoMeetings = await Meeting.find({ employeeId }).lean();
      actualMeetings = mongoMeetings.map((meeting) => ({
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
      if (actualMeetings.length === 0) {
        const { inMemoryMeetings: inMemoryMeetings2 } = await Promise.resolve().then(() => meetings);
        actualMeetings = (inMemoryMeetings2 || []).filter((meeting) => meeting.employeeId === employeeId);
        console.log(`Fallback: Using ${actualMeetings.length} meetings from memory for employee ${employeeId}`);
      }
    } catch (dbError) {
      console.warn("MongoDB query failed, falling back to in-memory meetings:", dbError);
      const { inMemoryMeetings: inMemoryMeetings2 } = await Promise.resolve().then(() => meetings);
      actualMeetings = (inMemoryMeetings2 || []).filter((meeting) => meeting.employeeId === employeeId);
    }
    const employeeMeetings = actualMeetings.filter((meeting) => {
      const meetingDate = new Date(meeting.startTime);
      const meetingTime = meetingDate.getTime();
      const startTime = start.getTime();
      const endTime = end.getTime();
      const inDateRange = meetingTime >= startTime && meetingTime <= endTime;
      if (inDateRange) {
        console.log(`✅ Employee meeting ${meeting.id} included: ${meeting.startTime} (${meeting.clientName || "No client"}) [Status: ${meeting.status}]`);
      } else {
        console.log(`❌ Employee meeting ${meeting.id} excluded: ${meeting.startTime} (outside ${start.toISOString()} to ${end.toISOString()}) [Status: ${meeting.status}]`);
      }
      return inDateRange;
    });
    console.log(`Filtered to ${employeeMeetings.length} meetings in date range for employee ${employeeId}`);
    let trackingSessions2 = [];
    try {
      const { TrackingSession: TrackingSession2 } = await import("./index-BZmtEn10.js");
      const mongoSessions = await TrackingSession2.find({
        employeeId,
        startTime: { $gte: start.toISOString(), $lte: end.toISOString() }
      }).lean();
      trackingSessions2 = mongoSessions.map((session) => ({
        id: session.id,
        employeeId: session.employeeId,
        startTime: session.startTime,
        endTime: session.endTime,
        startLocation: session.startLocation,
        endLocation: session.endLocation,
        status: session.status,
        duration: session.duration
      }));
      console.log(`Found ${trackingSessions2.length} tracking sessions for employee ${employeeId}`);
    } catch (dbError) {
      console.warn("Failed to fetch tracking sessions:", dbError);
    }
    const dateGroups = employeeMeetings.reduce(
      (groups, meeting) => {
        const date = format(new Date(meeting.startTime), "yyyy-MM-dd");
        if (!groups[date]) groups[date] = [];
        groups[date].push(meeting);
        return groups;
      },
      {}
    );
    const sessionDateGroups = trackingSessions2.reduce(
      (groups, session) => {
        const date = format(new Date(session.startTime), "yyyy-MM-dd");
        if (!groups[date]) groups[date] = [];
        groups[date].push(session);
        return groups;
      },
      {}
    );
    const allDates = /* @__PURE__ */ new Set([
      ...Object.keys(dateGroups),
      ...Object.keys(sessionDateGroups)
    ]);
    let attendanceRecords = [];
    try {
      const mongoAttendance = await Attendance.find({
        employeeId,
        date: {
          $gte: format(start, "yyyy-MM-dd"),
          $lte: format(end, "yyyy-MM-dd")
        }
      }).lean();
      attendanceRecords = mongoAttendance.map((att) => ({
        date: att.date,
        attendenceCreated: att.attendenceCreated,
        attendanceStatus: att.attendanceStatus,
        attendanceReason: att.attendanceReason
      }));
      console.log(`Found ${attendanceRecords.length} attendance records for employee ${employeeId}`);
    } catch (dbError) {
      console.warn("Failed to fetch attendance records:", dbError);
    }
    const externalUsers = await fetchExternalUsers();
    const userMap = new Map(externalUsers.map((user) => [user._id, user.name]));
    const dayRecords = Array.from(allDates).map((date) => {
      const meetings2 = dateGroups[date] || [];
      const sessions = sessionDateGroups[date] || [];
      const totalMeetings = meetings2.length;
      const totalMeetingHours = meetings2.reduce((total, meeting) => {
        return total + calculateMeetingDuration(meeting.startTime, meeting.endTime);
      }, 0);
      const sortedMeetings = [...meetings2].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      const firstMeeting = sortedMeetings[0];
      const lastMeeting = sortedMeetings[sortedMeetings.length - 1];
      const firstSession = sessions[0];
      const lastSession = sessions[sessions.length - 1];
      const startLocationTime = firstMeeting?.startTime || "";
      const startLocationAddress = firstMeeting?.location?.address || "";
      const outLocationTime = lastMeeting?.endTime || "";
      const outLocationAddress = lastMeeting?.endTime && lastMeeting?.location?.endLocation?.address ? lastMeeting.location.endLocation.address : lastMeeting?.location?.address || "";
      let totalDutyHours = 8;
      if (firstSession && lastSession?.endTime) {
        const sessionDuration = (new Date(lastSession.endTime).getTime() - new Date(firstSession.startTime).getTime()) / (1e3 * 60 * 60);
        totalDutyHours = Math.max(0, sessionDuration);
      }
      const attendance = attendanceRecords.find((att) => att.date === date);
      const attendanceAddedBy = attendance?.attendenceCreated ? userMap.get(attendance.attendenceCreated) || attendance.attendenceCreated : null;
      console.log(`Day record for ${date}:`);
      console.log(`  - Meetings: ${totalMeetings}, Meeting hours: ${totalMeetingHours.toFixed(2)}h`);
      console.log(`  - ✅ Start Location Time: ${startLocationTime || "N/A"} (from FIRST MEETING START)`);
      console.log(`  - ✅ Out Location Time: ${outLocationTime || "N/A"} (from LAST MEETING END)`);
      console.log(`  - Tracking sessions: ${sessions.length}, Attendance added by: ${attendanceAddedBy || "N/A"}`);
      return {
        date,
        totalMeetings,
        startLocationTime,
        startLocationAddress,
        outLocationTime,
        outLocationAddress,
        totalDutyHours: parseFloat(totalDutyHours.toFixed(2)),
        meetingTime: totalMeetingHours,
        travelAndLunchTime: Math.max(0, totalDutyHours - totalMeetingHours),
        attendanceAddedBy
        // 🔹 NEW: Person who added the attendance
      };
    });
    const meetingRecords = employeeMeetings.map((meeting) => {
      console.log(`📋 Generating meeting record for meeting ${meeting.id}:`, {
        status: meeting.status,
        clientName: meeting.clientName,
        startTime: meeting.startTime,
        endTime: meeting.endTime || "N/A (active meeting)",
        hasDetails: !!meeting.meetingDetails
      });
      return {
        employeeName: "",
        // Will be filled by client
        companyName: meeting.clientName || "Unknown Company",
        date: format(new Date(meeting.startTime), "yyyy-MM-dd"),
        leadId: meeting.leadId || "",
        meetingInTime: format(new Date(meeting.startTime), "HH:mm"),
        meetingInLocation: meeting.location?.address || "",
        meetingOutTime: meeting.endTime ? format(new Date(meeting.endTime), "HH:mm") : "In Progress",
        // Show "In Progress" for active meetings
        // 🔹 FIX: Only show end location if meeting has ended, use endLocation field
        meetingOutLocation: meeting.endTime && meeting.location?.endLocation?.address ? meeting.location.endLocation.address : meeting.status === "completed" ? "" : "Meeting in progress",
        totalStayTime: calculateMeetingDuration(
          meeting.startTime,
          meeting.endTime
        ),
        discussion: meeting.meetingDetails?.discussion || meeting.notes || (meeting.status !== "completed" ? "Meeting in progress" : ""),
        meetingPerson: meeting.meetingDetails?.customers?.length > 0 ? meeting.meetingDetails.customers.map((customer) => customer.customerEmployeeName).join(", ") : meeting.meetingDetails?.customerEmployeeName || (meeting.status !== "completed" ? "TBD" : "Unknown"),
        meetingStatus: meeting.status || "completed",
        // Internal meeting status
        externalMeetingStatus: meeting.externalMeetingStatus || "",
        // 🔹 NEW: Status from external follow-up API
        incomplete: meeting.meetingDetails?.incomplete || false,
        // Include incomplete flag
        incompleteReason: meeting.meetingDetails?.incompleteReason || ""
        // Include incomplete reason
      };
    });
    const finalResult = {
      dayRecords: dayRecords.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
      meetingRecords: meetingRecords.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    };
    console.log(`Employee details result: ${finalResult.dayRecords.length} day records, ${finalResult.meetingRecords.length} meeting records`);
    res.json(finalResult);
  } catch (error) {
    console.error("Error fetching employee details:", error);
    res.status(500).json({ error: "Failed to fetch employee details" });
  }
};
const getLeadHistory = async (req, res) => {
  try {
    const { leadId } = req.params;
    console.log(`Fetching history for lead: ${leadId}`);
    let actualMeetings = [];
    try {
      const mongoMeetings = await Meeting.find({ leadId }).lean();
      actualMeetings = mongoMeetings.map((meeting) => ({
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
      if (actualMeetings.length === 0) {
        const { inMemoryMeetings: inMemoryMeetings2 } = await Promise.resolve().then(() => meetings);
        actualMeetings = (inMemoryMeetings2 || []).filter((meeting) => meeting.leadId === leadId);
        console.log(`Fallback: Using ${actualMeetings.length} meetings from memory for lead ${leadId}`);
      }
    } catch (dbError) {
      console.warn("MongoDB query failed, falling back to in-memory meetings:", dbError);
      const { inMemoryMeetings: inMemoryMeetings2 } = await Promise.resolve().then(() => meetings);
      actualMeetings = (inMemoryMeetings2 || []).filter((meeting) => meeting.leadId === leadId);
    }
    const leadMeetings = actualMeetings.filter((meeting) => meeting.leadId === leadId);
    console.log(`Found ${leadMeetings.length} meetings for lead ${leadId}`);
    const externalUsers = await fetchExternalUsers();
    const employees = externalUsers.map((user, index) => mapExternalUserToEmployee(user, index));
    const history = leadMeetings.map((meeting) => {
      const employee = employees.find((emp) => emp.id === meeting.employeeId);
      const duration = calculateMeetingDuration(meeting.startTime, meeting.endTime);
      return {
        date: meeting.startTime,
        employeeName: employee?.name || "Unknown Employee",
        companyName: meeting.clientName || "Unknown Company",
        duration,
        meetingPerson: meeting.meetingDetails?.customers?.length > 0 ? meeting.meetingDetails.customers.map((customer) => customer.customerEmployeeName).join(", ") : meeting.meetingDetails?.customerEmployeeName || "Unknown",
        discussion: meeting.meetingDetails?.discussion || meeting.notes || "",
        status: meeting.status || "completed",
        location: meeting.location?.address || "",
        leadInfo: meeting.leadInfo
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json({
      leadId,
      history,
      totalMeetings: history.length,
      totalDuration: history.reduce((sum, record) => sum + record.duration, 0)
    });
  } catch (error) {
    console.error("Error fetching lead history:", error);
    res.status(500).json({ error: "Failed to fetch lead history" });
  }
};
const saveAttendance = async (req, res) => {
  try {
    const { employeeId, date, attendanceStatus, attendanceReason, attendenceCreated } = req.body;
    console.log(`Saving attendance for employee ${employeeId} on ${date}:`, {
      attendanceStatus,
      attendanceReason,
      attendenceCreated
    });
    if (!employeeId || !date || !attendanceStatus) {
      return res.status(400).json({
        error: "Employee ID, date, and attendance status are required"
      });
    }
    const validStatuses = ["full_day", "half_day", "off", "short_leave", "ot"];
    if (!validStatuses.includes(attendanceStatus)) {
      return res.status(400).json({
        error: "Invalid attendance status"
      });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: "Date must be in YYYY-MM-DD format"
      });
    }
    try {
      const savedAttendance = await Attendance.findOneAndUpdate(
        { employeeId, date },
        {
          employeeId,
          date,
          attendanceStatus,
          attendanceReason: attendanceReason || "",
          attendenceCreated: attendenceCreated !== void 0 ? attendenceCreated : null
          // Default to null if not provided
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
      res.json({
        success: true,
        message: "Attendance saved successfully (fallback mode)",
        data: {
          employeeId,
          date,
          attendanceStatus,
          attendanceReason,
          attendenceCreated: attendenceCreated !== void 0 ? attendenceCreated : null,
          savedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    }
  } catch (error) {
    console.error("Error saving attendance:", error);
    res.status(500).json({ error: "Failed to save attendance" });
  }
};
const getMeetingTrends = async (req, res) => {
  try {
    const { employeeId, period = "week" } = req.query;
    const trends = {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          label: "Meetings",
          data: [2, 4, 3, 5, 2, 1, 0]
        },
        {
          label: "Hours",
          data: [4, 8, 6, 10, 4, 2, 0]
        }
      ]
    };
    res.json(trends);
  } catch (error) {
    console.error("Error fetching meeting trends:", error);
    res.status(500).json({ error: "Failed to fetch trends" });
  }
};
const getAttendance = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, date } = req.query;
    console.log(`Fetching attendance records:`, {
      employeeId,
      startDate,
      endDate,
      date
    });
    const filter = {};
    if (employeeId) {
      filter.employeeId = employeeId;
    }
    if (date) {
      filter.date = date;
    } else if (startDate && endDate) {
      filter.date = {
        $gte: startDate,
        $lte: endDate
      };
    }
    try {
      const attendanceRecords = await Attendance.find(filter).sort({ date: -1 }).lean();
      console.log(`Found ${attendanceRecords.length} attendance records`);
      const externalUsers = await fetchExternalUsers();
      const userMap = new Map(externalUsers.map((user) => [user._id, user.name]));
      const formattedRecords = attendanceRecords.map((record) => ({
        id: record._id.toString(),
        employeeId: record.employeeId,
        date: record.date,
        attendanceStatus: record.attendanceStatus,
        attendanceReason: record.attendanceReason || "",
        attendenceCreated: record.attendenceCreated,
        attendenceCreatedName: record.attendenceCreated ? userMap.get(record.attendenceCreated) || record.attendenceCreated : null,
        savedAt: record.updatedAt || record.createdAt
      }));
      res.json({
        success: true,
        count: formattedRecords.length,
        data: formattedRecords
      });
    } catch (dbError) {
      console.warn("MongoDB query failed:", dbError);
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
const syncAllData = async (req, res) => {
  try {
    console.log("Starting data synchronization...");
    const { employeeId } = req.query;
    const mongoMeetings = await Meeting.find(employeeId ? { employeeId } : {}).lean();
    const mongoHistory = await MeetingHistory.find(employeeId ? { employeeId } : {}).lean();
    console.log(`Found ${mongoMeetings.length} meetings and ${mongoHistory.length} history entries in MongoDB`);
    const { meetings: inMemoryMeetings2 } = await Promise.resolve().then(() => meetings);
    console.log(`Found ${inMemoryMeetings2.length} meetings in memory`);
    let syncedMeetings = 0;
    let syncedHistory = 0;
    for (const meeting of inMemoryMeetings2) {
      if (employeeId && meeting.employeeId !== employeeId) continue;
      const exists = await Meeting.findOne({
        employeeId: meeting.employeeId,
        startTime: meeting.startTime
      });
      if (!exists) {
        try {
          const newMeeting = new Meeting({
            employeeId: meeting.employeeId,
            location: meeting.location,
            startTime: meeting.startTime,
            endTime: meeting.endTime,
            clientName: meeting.clientName,
            notes: meeting.notes,
            status: meeting.status,
            trackingSessionId: meeting.trackingSessionId,
            leadId: meeting.leadId,
            leadInfo: meeting.leadInfo,
            meetingDetails: meeting.meetingDetails
          });
          await newMeeting.save();
          syncedMeetings++;
          if (meeting.status === "completed" && meeting.meetingDetails) {
            const historyExists = await MeetingHistory.findOne({
              employeeId: meeting.employeeId,
              "meetingDetails.discussion": meeting.meetingDetails.discussion
            });
            if (!historyExists) {
              const newHistory = new MeetingHistory({
                sessionId: meeting.trackingSessionId || `sync_${Date.now()}`,
                employeeId: meeting.employeeId,
                meetingDetails: meeting.meetingDetails,
                timestamp: meeting.endTime || meeting.startTime,
                leadId: meeting.leadId,
                leadInfo: meeting.leadInfo
              });
              await newHistory.save();
              syncedHistory++;
            }
          }
        } catch (syncError) {
          console.warn(`Failed to sync meeting ${meeting.id}:`, syncError);
        }
      }
    }
    const finalMeetings = await Meeting.countDocuments(employeeId ? { employeeId } : {});
    const finalHistory = await MeetingHistory.countDocuments(employeeId ? { employeeId } : {});
    const result = {
      success: true,
      message: "Data synchronization completed",
      stats: {
        totalMeetingsInMongoDB: finalMeetings,
        totalHistoryInMongoDB: finalHistory,
        meetingsSynced: syncedMeetings,
        historySynced: syncedHistory,
        employeeId: employeeId || "all"
      }
    };
    console.log("Data sync result:", result);
    res.json(result);
  } catch (error) {
    console.error("Error synchronizing data:", error);
    res.status(500).json({
      error: "Failed to synchronize data",
      details: error.message
    });
  }
};
const getDataStatus = async (req, res) => {
  try {
    const { employeeId } = req.query;
    const mongoMeetingsCount = await Meeting.countDocuments(employeeId ? { employeeId } : {});
    const mongoHistoryCount = await MeetingHistory.countDocuments(employeeId ? { employeeId } : {});
    const mongoEmployeesCount = await Employee.countDocuments();
    const mongoTrackingCount = await TrackingSession.countDocuments(employeeId ? { employeeId } : {});
    const { meetings: inMemoryMeetings2 } = await Promise.resolve().then(() => meetings);
    const filteredInMemoryMeetings = employeeId ? inMemoryMeetings2.filter((m) => m.employeeId === employeeId) : inMemoryMeetings2;
    const sampleMongoMeeting = await Meeting.findOne(employeeId ? { employeeId } : {}).lean();
    const sampleMongoHistory = await MeetingHistory.findOne(employeeId ? { employeeId } : {}).lean();
    const status = {
      employeeId: employeeId || "all",
      mongoDB: {
        meetings: mongoMeetingsCount,
        history: mongoHistoryCount,
        employees: mongoEmployeesCount,
        trackingSessions: mongoTrackingCount,
        sampleMeeting: sampleMongoMeeting ? {
          id: sampleMongoMeeting._id,
          employeeId: sampleMongoMeeting.employeeId,
          status: sampleMongoMeeting.status,
          hasDetails: !!sampleMongoMeeting.meetingDetails,
          leadId: sampleMongoMeeting.leadId
        } : null,
        sampleHistory: sampleMongoHistory ? {
          id: sampleMongoHistory._id,
          employeeId: sampleMongoHistory.employeeId,
          hasCustomers: sampleMongoHistory.meetingDetails?.customers?.length > 0,
          discussion: sampleMongoHistory.meetingDetails?.discussion?.substring(0, 100)
        } : null
      },
      inMemory: {
        meetings: filteredInMemoryMeetings.length,
        sampleMeeting: filteredInMemoryMeetings[0] ? {
          id: filteredInMemoryMeetings[0].id,
          employeeId: filteredInMemoryMeetings[0].employeeId,
          status: filteredInMemoryMeetings[0].status,
          hasDetails: !!filteredInMemoryMeetings[0].meetingDetails
        } : null
      }
    };
    res.json(status);
  } catch (error) {
    console.error("Error getting data status:", error);
    res.status(500).json({
      error: "Failed to get data status",
      details: error.message
    });
  }
};
const debugEmployeeData = async (req, res) => {
  try {
    const { employeeId } = req.params;
    console.log(`Debugging data for employee: ${employeeId}`);
    const mongoMeetings = await Meeting.find({ employeeId }).lean();
    console.log(`Found ${mongoMeetings.length} meetings in MongoDB for employee ${employeeId}`);
    const mongoHistory = await MeetingHistory.find({ employeeId }).lean();
    console.log(`Found ${mongoHistory.length} history entries in MongoDB for employee ${employeeId}`);
    const { meetings: inMemoryMeetings2 } = await Promise.resolve().then(() => meetings);
    const filteredInMemory = inMemoryMeetings2.filter((m) => m.employeeId === employeeId);
    console.log(`Found ${filteredInMemory.length} meetings in memory for employee ${employeeId}`);
    const debugData = {
      employeeId,
      mongoDB: {
        meetings: {
          count: mongoMeetings.length,
          data: mongoMeetings.map((m) => ({
            id: m._id.toString(),
            startTime: m.startTime,
            endTime: m.endTime,
            status: m.status,
            clientName: m.clientName,
            leadId: m.leadId,
            hasDetails: !!m.meetingDetails,
            detailsCustomers: m.meetingDetails?.customers?.length || 0
          }))
        },
        history: {
          count: mongoHistory.length,
          data: mongoHistory.map((h) => ({
            id: h._id.toString(),
            timestamp: h.timestamp,
            sessionId: h.sessionId,
            leadId: h.leadId,
            hasDetails: !!h.meetingDetails,
            discussion: h.meetingDetails?.discussion?.substring(0, 100),
            customers: h.meetingDetails?.customers?.length || 0,
            customerNames: h.meetingDetails?.customers?.map((c) => c.customerEmployeeName) || []
          }))
        }
      },
      inMemory: {
        meetings: {
          count: filteredInMemory.length,
          data: filteredInMemory.map((m) => ({
            id: m.id,
            startTime: m.startTime,
            endTime: m.endTime,
            status: m.status,
            clientName: m.clientName,
            leadId: m.leadId,
            hasDetails: !!m.meetingDetails
          }))
        }
      },
      recommendations: []
    };
    if (mongoMeetings.length === 0 && filteredInMemory.length > 0) {
      debugData.recommendations.push("Meetings exist in memory but not in MongoDB - run data sync");
    }
    if (mongoMeetings.length > mongoHistory.length) {
      debugData.recommendations.push("More meetings than history entries - some meetings may not have been completed properly");
    }
    if (mongoHistory.length === 0) {
      debugData.recommendations.push("No meeting history found - check if meetings are being ended with proper details");
    }
    console.log("Debug data prepared:", JSON.stringify(debugData, null, 2));
    res.json(debugData);
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    res.status(500).json({ error: "Debug failed", details: error.message });
  }
};
let inMemorySnapshots = [];
const getRouteSnapshots = async (req, res) => {
  try {
    const {
      employeeId,
      trackingSessionId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;
    console.log("Fetching route snapshots with query:", { employeeId, trackingSessionId, status, startDate, endDate });
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    try {
      const query = {};
      if (employeeId) {
        query.employeeId = employeeId;
      }
      if (trackingSessionId) {
        query.trackingSessionId = trackingSessionId;
      }
      if (status) {
        query.status = status;
      }
      if (startDate || endDate) {
        query.captureTime = {};
        if (startDate) {
          query.captureTime.$gte = new Date(startDate).toISOString();
        }
        if (endDate) {
          query.captureTime.$lte = new Date(endDate).toISOString();
        }
      }
      const snapshots = await RouteSnapshot.find(query).sort({ captureTime: -1 }).skip(skip).limit(limitNum).lean();
      const total = await RouteSnapshot.countDocuments(query);
      const response = {
        snapshots,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      };
      console.log(`Found ${snapshots.length} route snapshots from MongoDB`);
      res.json(response);
    } catch (mongoError) {
      console.error("MongoDB query failed, falling back to in-memory storage:", mongoError);
      let filteredSnapshots = [...inMemorySnapshots];
      if (employeeId) {
        filteredSnapshots = filteredSnapshots.filter((s) => s.employeeId === employeeId);
      }
      if (trackingSessionId) {
        filteredSnapshots = filteredSnapshots.filter((s) => s.trackingSessionId === trackingSessionId);
      }
      if (status) {
        filteredSnapshots = filteredSnapshots.filter((s) => s.status === status);
      }
      if (startDate || endDate) {
        filteredSnapshots = filteredSnapshots.filter((s) => {
          const captureTime = new Date(s.captureTime);
          if (startDate && captureTime < new Date(startDate)) return false;
          if (endDate && captureTime > new Date(endDate)) return false;
          return true;
        });
      }
      filteredSnapshots.sort((a, b) => new Date(b.captureTime).getTime() - new Date(a.captureTime).getTime());
      const total = filteredSnapshots.length;
      const paginatedSnapshots = filteredSnapshots.slice(skip, skip + limitNum);
      const response = {
        snapshots: paginatedSnapshots,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      };
      console.log(`Found ${paginatedSnapshots.length} route snapshots from memory (${total} total)`);
      res.json(response);
    }
  } catch (error) {
    console.error("Error fetching route snapshots:", error);
    res.status(500).json({ error: "Failed to fetch route snapshots" });
  }
};
const getRouteSnapshot = async (req, res) => {
  try {
    const { id } = req.params;
    try {
      const snapshot = await RouteSnapshot.findOne({ id });
      if (snapshot) {
        console.log("Route snapshot found in MongoDB:", snapshot.id);
        return res.json(snapshot);
      }
    } catch (mongoError) {
      console.error("MongoDB query failed, checking in-memory storage:", mongoError);
    }
    const memorySnapshot = inMemorySnapshots.find((s) => s.id === id);
    if (memorySnapshot) {
      console.log("Route snapshot found in memory:", memorySnapshot.id);
      return res.json(memorySnapshot);
    }
    return res.status(404).json({ error: "Route snapshot not found" });
  } catch (error) {
    console.error("Error fetching route snapshot:", error);
    res.status(500).json({ error: "Failed to fetch route snapshot" });
  }
};
const createRouteSnapshot = async (req, res) => {
  try {
    const {
      employeeId,
      employeeName,
      trackingSessionId,
      title,
      description,
      startLocation,
      endLocation,
      route,
      meetings: meetings2,
      totalDistance,
      duration,
      status,
      mapBounds
    } = req.body;
    if (!employeeId || !employeeName || !title || !startLocation || !route || !mapBounds) {
      return res.status(400).json({
        error: "Employee ID, name, title, start location, route, and map bounds are required"
      });
    }
    const snapshotId = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const snapshotMetadata = {
      routeColor: "#3b82f6",
      mapZoom: 12,
      routePointsCount: route.length,
      meetingsCount: meetings2 ? meetings2.length : 0
    };
    const snapshotData = {
      id: snapshotId,
      employeeId,
      employeeName,
      trackingSessionId,
      captureTime: (/* @__PURE__ */ new Date()).toISOString(),
      title,
      description,
      startLocation: {
        ...startLocation,
        timestamp: startLocation.timestamp || (/* @__PURE__ */ new Date()).toISOString()
      },
      endLocation: endLocation ? {
        ...endLocation,
        timestamp: endLocation.timestamp || (/* @__PURE__ */ new Date()).toISOString()
      } : void 0,
      route: route.map((point) => ({
        ...point,
        timestamp: point.timestamp || (/* @__PURE__ */ new Date()).toISOString()
      })),
      meetings: meetings2 || [],
      totalDistance: totalDistance || 0,
      duration,
      status: status || "active",
      mapBounds,
      snapshotMetadata
    };
    try {
      const newSnapshot = new RouteSnapshot(snapshotData);
      const savedSnapshot = await newSnapshot.save();
      console.log("Route snapshot created in MongoDB:", savedSnapshot.id);
      res.status(201).json(savedSnapshot);
    } catch (mongoError) {
      console.error("MongoDB save failed, saving to in-memory storage:", mongoError);
      inMemorySnapshots.push(snapshotData);
      console.log("Route snapshot created in memory:", snapshotData.id);
      res.status(201).json(snapshotData);
    }
  } catch (error) {
    console.error("Error creating route snapshot:", error);
    res.status(500).json({ error: "Failed to create route snapshot" });
  }
};
const updateRouteSnapshot = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    let updated = false;
    try {
      const updatedSnapshot = await RouteSnapshot.findOneAndUpdate(
        { id },
        { $set: updates },
        { new: true, runValidators: true }
      );
      if (updatedSnapshot) {
        console.log("Route snapshot updated in MongoDB:", updatedSnapshot.id);
        return res.json(updatedSnapshot);
      }
    } catch (mongoError) {
      console.error("MongoDB update failed, checking in-memory storage:", mongoError);
    }
    const memoryIndex = inMemorySnapshots.findIndex((s) => s.id === id);
    if (memoryIndex !== -1) {
      inMemorySnapshots[memoryIndex] = { ...inMemorySnapshots[memoryIndex], ...updates };
      console.log("Route snapshot updated in memory:", inMemorySnapshots[memoryIndex].id);
      return res.json(inMemorySnapshots[memoryIndex]);
    }
    return res.status(404).json({ error: "Route snapshot not found" });
  } catch (error) {
    console.error("Error updating route snapshot:", error);
    res.status(500).json({ error: "Failed to update route snapshot" });
  }
};
const deleteRouteSnapshot = async (req, res) => {
  try {
    const { id } = req.params;
    let deleted = false;
    try {
      const deletedSnapshot = await RouteSnapshot.findOneAndDelete({ id });
      if (deletedSnapshot) {
        console.log("Route snapshot deleted from MongoDB:", deletedSnapshot.id);
        deleted = true;
      }
    } catch (mongoError) {
      console.error("MongoDB delete failed, checking in-memory storage:", mongoError);
    }
    const memoryIndex = inMemorySnapshots.findIndex((s) => s.id === id);
    if (memoryIndex !== -1) {
      const deletedSnapshot = inMemorySnapshots.splice(memoryIndex, 1)[0];
      console.log("Route snapshot deleted from memory:", deletedSnapshot.id);
      deleted = true;
    }
    if (!deleted) {
      return res.status(404).json({ error: "Route snapshot not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting route snapshot:", error);
    res.status(500).json({ error: "Failed to delete route snapshot" });
  }
};
const getEmployeeSnapshots = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    try {
      const snapshots = await RouteSnapshot.find({ employeeId }).sort({ captureTime: -1 }).skip(skip).limit(limitNum).lean();
      const total = await RouteSnapshot.countDocuments({ employeeId });
      const response = {
        snapshots,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      };
      console.log(`Found ${snapshots.length} snapshots for employee ${employeeId} from MongoDB`);
      res.json(response);
    } catch (mongoError) {
      console.error("MongoDB query failed, falling back to in-memory storage:", mongoError);
      const employeeSnapshots = inMemorySnapshots.filter((s) => s.employeeId === employeeId);
      employeeSnapshots.sort((a, b) => new Date(b.captureTime).getTime() - new Date(a.captureTime).getTime());
      const total = employeeSnapshots.length;
      const paginatedSnapshots = employeeSnapshots.slice(skip, skip + limitNum);
      const response = {
        snapshots: paginatedSnapshots,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      };
      console.log(`Found ${paginatedSnapshots.length} snapshots for employee ${employeeId} from memory (${total} total)`);
      res.json(response);
    }
  } catch (error) {
    console.error("Error fetching employee snapshots:", error);
    res.status(500).json({ error: "Failed to fetch employee snapshots" });
  }
};
const updateFollowUpStatus = async (req, res) => {
  try {
    const { status, meetingDetails } = req.body;
    const followUpId = req.params && req.params.id || req.body && req.body.followUpId;
    if (!followUpId || !status) {
      return res.status(400).json({
        error: "Missing required fields: followUpId and status are required"
      });
    }
    console.log("Updating follow-up status:", {
      followUpId,
      status,
      meetingDetails
    });
    const externalApiUrl = process.env.VITE_EXTERNAL_LEAD_API || "https://jbdspower.in/LeafNetServer/api";
    const baseUrl = externalApiUrl.replace("/getAllLead", "");
    const updateUrl = `${baseUrl}/updateFollowUp/${followUpId}`;
    const updatePayload = {
      meetingStatus: status,
      meetingDetails,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    console.log("Sending update to external API (updateFollowUp/:id):", {
      url: updateUrl,
      payload: updatePayload
    });
    let response;
    try {
      response = await axios.put(updateUrl, updatePayload, {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 1e4
      });
    } catch (err) {
      console.warn("updateFollowUp/:id failed, falling back to updateFollowUpHistory", err?.message || err);
      const fallbackUrl = `${baseUrl}/updateFollowUpHistory`;
      const fallbackPayload = {
        id: followUpId,
        status,
        meetingDetails,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      console.log("Sending update to external API (fallback):", { url: fallbackUrl, payload: fallbackPayload });
      response = await axios.put(fallbackUrl, fallbackPayload, {
        headers: { "Content-Type": "application/json" },
        timeout: 1e4
      });
    }
    if (response.status === 200 || response.data.success) {
      console.log("Follow-up status updated successfully:", response.data);
      return res.json({
        message: "Follow-up status updated successfully",
        data: response.data
      });
    } else {
      console.error("Failed to update follow-up status:", response.data);
      return res.status(400).json({
        error: "Failed to update follow-up status",
        details: response.data
      });
    }
  } catch (error) {
    console.error("Error updating follow-up status:", error);
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.message || error.message;
      return res.status(error.response?.status || 500).json({
        error: "Failed to update follow-up status",
        details: errorMessage
      });
    }
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
const getFollowUpHistory = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({
        error: "Missing required parameter: userId"
      });
    }
    console.log("Fetching follow-up history for user:", userId);
    const externalApiUrl = process.env.VITE_EXTERNAL_LEAD_API || "https://jbdspower.in/LeafNetServer/api";
    const baseUrl = externalApiUrl.replace("/getAllLead", "");
    const url = `${baseUrl}/getFollowUpHistory?userId=${userId}`;
    console.log("Fetching from external API:", url);
    const response = await axios.get(url, {
      timeout: 1e4
    });
    if (response.status === 200 && response.data) {
      console.log(`Fetched ${response.data.length || 0} follow-up records`);
      return res.json(response.data);
    } else {
      console.error("Failed to fetch follow-up history:", response.data);
      return res.status(400).json({
        error: "Failed to fetch follow-up history",
        details: response.data
      });
    }
  } catch (error) {
    console.error("Error fetching follow-up history:", error);
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.message || error.message;
      return res.status(error.response?.status || 500).json({
        error: "Failed to fetch follow-up history",
        details: errorMessage
      });
    }
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
const __filename = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename);
function createServer() {
  const app2 = express__default();
  const initializeDatabase = async () => {
    try {
      const db = Database.getInstance();
      await db.connect();
    } catch (error) {
      console.error("Failed to initialize database:", error);
    }
  };
  initializeDatabase();
  app2.use(cors());
  app2.use(express__default.json());
  app2.use(express__default.urlencoded({ extended: true }));
  app2.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${(/* @__PURE__ */ new Date()).toISOString()}`);
    next();
  });
  app2.get("/api/ping", (_req, res) => {
    console.log("Health check ping received");
    res.json({
      message: "Hello from Express server v2!",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: "ok"
    });
  });
  app2.get("/api/demo", handleDemo);
  app2.get("/api/test-attendance", (_req, res) => {
    console.log("Test attendance endpoint hit");
    res.json({
      message: "Attendance route is working!",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: "ok"
    });
  });
  app2.get("/api/employees", getEmployees);
  app2.post("/api/employees", createEmployee);
  app2.get("/api/employees/:id", getEmployee);
  app2.put("/api/employees/:id", updateEmployee);
  app2.delete("/api/employees/:id", deleteEmployee);
  app2.put("/api/employees/:id/location", updateEmployeeLocation);
  app2.put("/api/employees/:id/status", updateEmployeeStatus);
  app2.post("/api/employees/refresh-locations", refreshEmployeeLocations);
  app2.post("/api/employees/clear-cache", clearLocationCache);
  app2.get("/api/meetings", getMeetings);
  app2.post("/api/meetings", createMeeting);
  app2.get("/api/meetings/active", getActiveMeeting);
  app2.get("/api/meetings/:id", getMeeting);
  app2.put("/api/meetings/:id", updateMeeting);
  app2.delete("/api/meetings/:id", deleteMeeting);
  app2.get("/api/tracking-sessions", getTrackingSessions);
  app2.post("/api/tracking-sessions", createTrackingSession);
  app2.get("/api/tracking-sessions/:id", getTrackingSession);
  app2.put("/api/tracking-sessions/:id", updateTrackingSession);
  app2.delete("/api/tracking-sessions/:id", deleteTrackingSession);
  app2.post("/api/tracking-sessions/:id/location", addLocationToRoute);
  app2.get("/api/meeting-history", getMeetingHistory);
  app2.post("/api/meeting-history", addMeetingToHistory);
  app2.post("/api/incomplete-meeting-remarks", saveIncompleteMeetingRemark);
  app2.get("/api/get-incomplete-meeting-remarks", getIncompleteMeetingRemark);
  app2.get("/api/incomplete-meeting-remarks", getIncompleteMeetingRemark);
  app2.get("/api/analytics/employees", getEmployeeAnalytics);
  app2.get("/api/analytics/employee-details/:employeeId", getEmployeeDetails);
  app2.get("/api/analytics/lead-history/:leadId", getLeadHistory);
  app2.post("/api/analytics/save-attendance", saveAttendance);
  app2.get("/api/analytics/attendance", (req, res, next) => {
    console.log("🎯 Attendance route hit!", {
      query: req.query,
      url: req.url,
      method: req.method
    });
    getAttendance(req, res);
  });
  app2.get("/api/analytics/trends", getMeetingTrends);
  app2.post("/api/data-sync", syncAllData);
  app2.get("/api/data-status", getDataStatus);
  app2.get("/api/debug/employee/:employeeId", debugEmployeeData);
  app2.get("/api/route-snapshots", getRouteSnapshots);
  app2.post("/api/route-snapshots", createRouteSnapshot);
  app2.get("/api/route-snapshots/:id", getRouteSnapshot);
  app2.put("/api/route-snapshots/:id", updateRouteSnapshot);
  app2.delete("/api/route-snapshots/:id", deleteRouteSnapshot);
  app2.get("/api/employees/:employeeId/snapshots", getEmployeeSnapshots);
  app2.get("/api/follow-ups", getFollowUpHistory);
  app2.put("/api/follow-ups/:id", updateFollowUpStatus);
  {
    const distPath2 = path.join(__dirname$1, "../spa");
    console.log("📦 Serving static files from:", distPath2);
    app2.use(express__default.static(distPath2));
    app2.get("*", (req, res) => {
      if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: "API endpoint not found" });
      }
      const indexPath = path.join(distPath2, "index.html");
      console.log("📄 Serving index.html for:", req.path);
      res.sendFile(indexPath);
    });
  }
  return app2;
}
const app = createServer();
const port = process.env.PORT || 3e3;
const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../spa");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.sendFile(path.join(distPath, "index.html"));
});
app.listen(port, () => {
  console.log(`🚀 Fusion Starter server running on port ${port}`);
  console.log(`📱 Frontend: http://localhost:${port}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
});
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
export {
  Attendance as A,
  Employee as E,
  Meeting as M,
  RouteSnapshot as R,
  TrackingSession as T,
  MeetingHistory as a
};
//# sourceMappingURL=node-build.mjs.map
