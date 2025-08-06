import mongoose, { Schema, Document } from 'mongoose';

// Location data interface
interface LocationData {
  lat: number;
  lng: number;
  address: string;
  timestamp: string;
}

// Meeting snapshot data interface
interface MeetingSnapshot {
  id: string;
  location: LocationData;
  clientName?: string;
  startTime: string;
  endTime?: string;
  status: string;
}

// Route snapshot document interface
export interface IRouteSnapshot extends Document {
  id: string;
  employeeId: string;
  employeeName: string;
  trackingSessionId?: string;
  captureTime: string;
  startLocation: LocationData;
  endLocation?: LocationData;
  route: LocationData[];
  meetings: MeetingSnapshot[];
  totalDistance: number;
  duration?: number;
  status: 'active' | 'completed';
  title: string;
  description?: string;
  mapBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  snapshotMetadata: {
    routeColor: string;
    mapZoom: number;
    routePointsCount: number;
    meetingsCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Location data schema
const LocationDataSchema = new Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, required: true },
  timestamp: { type: String, required: true }
});

// Meeting snapshot schema
const MeetingSnapshotSchema = new Schema({
  id: { type: String, required: true },
  location: { type: LocationDataSchema, required: true },
  clientName: { type: String },
  startTime: { type: String, required: true },
  endTime: { type: String },
  status: { type: String, required: true }
});

// Map bounds schema
const MapBoundsSchema = new Schema({
  north: { type: Number, required: true },
  south: { type: Number, required: true },
  east: { type: Number, required: true },
  west: { type: Number, required: true }
});

// Snapshot metadata schema
const SnapshotMetadataSchema = new Schema({
  routeColor: { type: String, default: '#3b82f6' },
  mapZoom: { type: Number, default: 12 },
  routePointsCount: { type: Number, default: 0 },
  meetingsCount: { type: Number, default: 0 }
});

// Route snapshot schema
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
    type: Number // Duration in seconds
  },
  status: { 
    type: String, 
    enum: ['active', 'completed'],
    default: 'active',
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
  collection: 'route_snapshots'
});

// Create indexes for better query performance
RouteSnapshotSchema.index({ employeeId: 1, captureTime: -1 });
RouteSnapshotSchema.index({ trackingSessionId: 1, captureTime: -1 });
RouteSnapshotSchema.index({ status: 1, captureTime: -1 });
RouteSnapshotSchema.index({ employeeId: 1, status: 1, captureTime: -1 });

export const RouteSnapshot = mongoose.model<IRouteSnapshot>('RouteSnapshot', RouteSnapshotSchema);
