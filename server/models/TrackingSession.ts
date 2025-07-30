import mongoose, { Schema, Document } from 'mongoose';

// Location data interface
interface LocationData {
  lat: number;
  lng: number;
  address: string;
  timestamp: string;
}

// Tracking session document interface
export interface ITrackingSession extends Document {
  id: string;
  employeeId: string;
  startTime: string;
  endTime?: string;
  startLocation: LocationData;
  endLocation?: LocationData;
  route: LocationData[];
  totalDistance: number;
  duration?: number;
  status: 'active' | 'completed' | 'paused';
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

// Tracking session schema
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
    type: LocationDataSchema, 
    required: true 
  },
  endLocation: { 
    type: LocationDataSchema 
  },
  route: [LocationDataSchema],
  totalDistance: { 
    type: Number, 
    default: 0 
  },
  duration: { 
    type: Number // Duration in seconds
  },
  status: { 
    type: String, 
    enum: ['active', 'completed', 'paused'],
    default: 'active',
    index: true 
  }
}, {
  timestamps: true,
  collection: 'tracking_sessions'
});

// Create indexes for better query performance
TrackingSessionSchema.index({ employeeId: 1, startTime: -1 });
TrackingSessionSchema.index({ status: 1, startTime: -1 });
TrackingSessionSchema.index({ employeeId: 1, status: 1, startTime: -1 });

export const TrackingSession = mongoose.model<ITrackingSession>('TrackingSession', TrackingSessionSchema);
