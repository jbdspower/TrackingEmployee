import mongoose, { Schema, Document } from 'mongoose';

// Customer contact interface
interface CustomerContact {
  customerName: string;
  customerEmployeeName: string;
  customerEmail?: string;
  customerMobile?: string;
  customerDesignation?: string;
  customerDepartment?: string;
}

// Meeting details interface
interface MeetingDetails {
  customers: CustomerContact[];
  discussion: string;
  // Legacy fields for backward compatibility
  customerName?: string;
  customerEmployeeName?: string;
  customerEmail?: string;
  customerMobile?: string;
  customerDesignation?: string;
  customerDepartment?: string;
}

// Location interface
interface Location {
  lat: number;
  lng: number;
  address: string;
  timestamp: string;
}

// Meeting document interface
export interface IMeeting extends Document {
  employeeId: string;
  location: Location;
  startTime: string;
  endTime?: string;
  clientName?: string;
  notes?: string;
  status: 'started' | 'in-progress' | 'completed';
  trackingSessionId?: string;
  leadId?: string;
  leadInfo?: {
    id: string;
    companyName: string;
    contactName: string;
  };
  meetingDetails?: MeetingDetails;
  createdAt: Date;
  updatedAt: Date;
}

// Customer contact schema
const CustomerContactSchema = new Schema({
  customerName: { type: String, required: true },
  customerEmployeeName: { type: String, required: true },
  customerEmail: { type: String },
  customerMobile: { type: String },
  customerDesignation: { type: String },
  customerDepartment: { type: String }
});

// Meeting details schema
const MeetingDetailsSchema = new Schema({
  customers: [CustomerContactSchema],
  discussion: { type: String, required: true },
  // Legacy fields
  customerName: { type: String },
  customerEmployeeName: { type: String },
  customerEmail: { type: String },
  customerMobile: { type: String },
  customerDesignation: { type: String },
  customerDepartment: { type: String }
});

// Location schema
const LocationSchema = new Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, required: true },
  timestamp: { type: String, required: true }
});

// Lead info schema
const LeadInfoSchema = new Schema({
  id: { type: String, required: true },
  companyName: { type: String, required: true },
  contactName: { type: String, required: true }
});

// Main meeting schema
const MeetingSchema = new Schema({
  employeeId: { 
    type: String, 
    required: true,
    index: true 
  },
  location: { 
    type: LocationSchema, 
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
    enum: ['started', 'in-progress', 'completed'],
    default: 'in-progress',
    index: true 
  },
  trackingSessionId: { 
    type: String 
  },
  leadId: { 
    type: String,
    index: true 
  },
  leadInfo: LeadInfoSchema,
  meetingDetails: MeetingDetailsSchema
}, {
  timestamps: true,
  collection: 'meetings'
});

// Create indexes for better query performance
MeetingSchema.index({ employeeId: 1, startTime: -1 });
MeetingSchema.index({ leadId: 1, startTime: -1 });
MeetingSchema.index({ status: 1, startTime: -1 });

export const Meeting = mongoose.model<IMeeting>('Meeting', MeetingSchema);
