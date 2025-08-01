import { RequestHandler } from "express";
import { RouteSnapshot, IRouteSnapshot } from "../models";

// In-memory fallback storage for route snapshots
let inMemorySnapshots: any[] = [];
export { inMemorySnapshots };

// Get route snapshots with filtering
export const getRouteSnapshots: RequestHandler = async (req, res) => {
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

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    try {
      // Build MongoDB query
      const query: any = {};

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
          query.captureTime.$gte = new Date(startDate as string).toISOString();
        }
        if (endDate) {
          query.captureTime.$lte = new Date(endDate as string).toISOString();
        }
      }

      const snapshots = await RouteSnapshot.find(query)
        .sort({ captureTime: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await RouteSnapshot.countDocuments(query);

      const response = {
        snapshots,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      };

      console.log(`Found ${snapshots.length} route snapshots from MongoDB`);
      res.json(response);
    } catch (mongoError) {
      console.error("MongoDB query failed, falling back to in-memory storage:", mongoError);

      // Fallback to in-memory storage
      let filteredSnapshots = [...inMemorySnapshots];

      // Apply filters
      if (employeeId) {
        filteredSnapshots = filteredSnapshots.filter(s => s.employeeId === employeeId);
      }

      if (trackingSessionId) {
        filteredSnapshots = filteredSnapshots.filter(s => s.trackingSessionId === trackingSessionId);
      }

      if (status) {
        filteredSnapshots = filteredSnapshots.filter(s => s.status === status);
      }

      if (startDate || endDate) {
        filteredSnapshots = filteredSnapshots.filter(s => {
          const captureTime = new Date(s.captureTime);
          if (startDate && captureTime < new Date(startDate as string)) return false;
          if (endDate && captureTime > new Date(endDate as string)) return false;
          return true;
        });
      }

      // Sort by capture time (newest first)
      filteredSnapshots.sort((a, b) => new Date(b.captureTime).getTime() - new Date(a.captureTime).getTime());

      // Apply pagination
      const total = filteredSnapshots.length;
      const paginatedSnapshots = filteredSnapshots.slice(skip, skip + limitNum);

      const response = {
        snapshots: paginatedSnapshots,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      };

      console.log(`Found ${paginatedSnapshots.length} route snapshots from memory (${total} total)`);
      res.json(response);
    }
  } catch (error) {
    console.error("Error fetching route snapshots:", error);
    res.status(500).json({ error: "Failed to fetch route snapshots" });
  }
};

// Get a specific route snapshot by ID
export const getRouteSnapshot: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const snapshot = await RouteSnapshot.findOne({ id });

    if (!snapshot) {
      return res.status(404).json({ error: "Route snapshot not found" });
    }

    console.log("Route snapshot found:", snapshot.id);
    res.json(snapshot);
  } catch (error) {
    console.error("Error fetching route snapshot:", error);
    res.status(500).json({ error: "Failed to fetch route snapshot" });
  }
};

// Create a new route snapshot
export const createRouteSnapshot: RequestHandler = async (req, res) => {
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
      meetings,
      totalDistance,
      duration,
      status,
      mapBounds
    } = req.body;

    if (!employeeId || !employeeName || !title || !startLocation || !route || !mapBounds) {
      return res.status(400).json({
        error: "Employee ID, name, title, start location, route, and map bounds are required",
      });
    }

    // Generate unique snapshot ID
    const snapshotId = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate snapshot metadata
    const snapshotMetadata = {
      routeColor: '#3b82f6',
      mapZoom: 12,
      routePointsCount: route.length,
      meetingsCount: meetings ? meetings.length : 0
    };

    const snapshotData = {
      id: snapshotId,
      employeeId,
      employeeName,
      trackingSessionId,
      captureTime: new Date().toISOString(),
      title,
      description,
      startLocation: {
        ...startLocation,
        timestamp: startLocation.timestamp || new Date().toISOString(),
      },
      endLocation: endLocation ? {
        ...endLocation,
        timestamp: endLocation.timestamp || new Date().toISOString(),
      } : undefined,
      route: route.map((point: any) => ({
        ...point,
        timestamp: point.timestamp || new Date().toISOString(),
      })),
      meetings: meetings || [],
      totalDistance: totalDistance || 0,
      duration,
      status: status || 'active',
      mapBounds,
      snapshotMetadata
    };

    try {
      // Try to save to MongoDB first
      const newSnapshot = new RouteSnapshot(snapshotData);
      const savedSnapshot = await newSnapshot.save();

      console.log("Route snapshot created in MongoDB:", savedSnapshot.id);
      res.status(201).json(savedSnapshot);
    } catch (mongoError) {
      console.error("MongoDB save failed, saving to in-memory storage:", mongoError);

      // Fallback to in-memory storage
      inMemorySnapshots.push(snapshotData);

      console.log("Route snapshot created in memory:", snapshotData.id);
      res.status(201).json(snapshotData);
    }
  } catch (error) {
    console.error("Error creating route snapshot:", error);
    res.status(500).json({ error: "Failed to create route snapshot" });
  }
};

// Update a route snapshot
export const updateRouteSnapshot: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedSnapshot = await RouteSnapshot.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedSnapshot) {
      return res.status(404).json({ error: "Route snapshot not found" });
    }

    console.log("Route snapshot updated:", updatedSnapshot.id);
    res.json(updatedSnapshot);
  } catch (error) {
    console.error("Error updating route snapshot:", error);
    res.status(500).json({ error: "Failed to update route snapshot" });
  }
};

// Delete a route snapshot
export const deleteRouteSnapshot: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedSnapshot = await RouteSnapshot.findOneAndDelete({ id });

    if (!deletedSnapshot) {
      return res.status(404).json({ error: "Route snapshot not found" });
    }

    console.log("Route snapshot deleted:", deletedSnapshot.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting route snapshot:", error);
    res.status(500).json({ error: "Failed to delete route snapshot" });
  }
};

// Get snapshots by employee
export const getEmployeeSnapshots: RequestHandler = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const snapshots = await RouteSnapshot.find({ employeeId })
      .sort({ captureTime: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await RouteSnapshot.countDocuments({ employeeId });

    const response = {
      snapshots,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    };

    console.log(`Found ${snapshots.length} snapshots for employee ${employeeId}`);
    res.json(response);
  } catch (error) {
    console.error("Error fetching employee snapshots:", error);
    res.status(500).json({ error: "Failed to fetch employee snapshots" });
  }
};
