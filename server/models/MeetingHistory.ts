import mongoose, { Schema, Document } from 'mongoose';

// Meeting details interface (reused from Meeting model)
interface MeetingDetails {
  customers: Array<{
    customerName: string;
    customerEmployeeName: string;
    customerEmail?: string;
    customerMobile?: string;
    customerDesignation?: string;
    customerDepartment?: string;
  }>;
  discussion: string;
  // Legacy fields
  customerName?: string;
  customerEmployeeName?: string;
  customerEmail?: string;
  customerMobile?: string;
  customerDesignation?: string;
  customerDepartment?: string;
}

// Meeting history document interface
export interface IMeetingHistory extends Document {
  sessionId: string;
  employeeId: string;
  meetingDetails: MeetingDetails;
  timestamp: string;
  leadId?: string;
  leadInfo?: {
    id: string;
    companyName: string;
    contactName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Customer contact schema (reused)
const CustomerContactSchema = new Schema({
  customerName: { type: String, required: true },
  customerEmployeeName: { type: String, required: true },
  customerEmail: { type: String },
  customerMobile: { type: String },
  customerDesignation: { type: String },
  customerDepartment: { type: String }
});

// Meeting details schema (reused)
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

// Lead info schema (reused)
const LeadInfoSchema = new Schema({
  id: { type: String, required: true },
  companyName: { type: String, required: true },
  contactName: { type: String, required: true }
});

// Meeting history schema
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
  collection: 'meeting_history'
});

// Create indexes for better query performance
MeetingHistorySchema.index({ employeeId: 1, timestamp: -1 });
MeetingHistorySchema.index({ leadId: 1, timestamp: -1 });
MeetingHistorySchema.index({ sessionId: 1, timestamp: -1 });

export const MeetingHistory = mongoose.model<IMeetingHistory>('MeetingHistory', MeetingHistorySchema);
