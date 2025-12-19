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
 attachments?: string[]; // Array of base64 encoded files or URLs
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
 followUpId?: string; // Follow-up meeting ID from external API
 meetingDetails?: MeetingDetails;
 externalMeetingStatus?: string; // Status from external follow-up API
 approvalStatus?: 'ok' | 'not_ok'; // Meeting approval status
 approvalReason?: string; // Reason for approval/rejection
 approvedBy?: string | null; // userId who approved the meeting
 attachments?: string[]; // Array of attachment file URLs/paths
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
 attachments: { type: [String], default: [] }, // Array of base64 encoded files or URLs
 // Legacy fields
 customerName: { type: String },
 customerEmployeeName: { type: String },
 customerEmail: { type: String },
 customerMobile: { type: String },
 customerDesignation: { type: String },
 customerDepartment: { type: String }
});


// Location schema
const CoordinateSchema = new Schema({
 lat: { type: Number, required: true },
 lng: { type: Number, required: true },
 address: { type: String, required: true },
 timestamp: { type: String }
}, { _id: false });


const LocationSchema = new Schema({
 lat: { type: Number, required: true },
 lng: { type: Number, required: true },
 address: { type: String, required: true },
 endLocation: { type: CoordinateSchema },
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
 followUpId: {
   type: String,
   index: true
 },
 meetingDetails: MeetingDetailsSchema,
 externalMeetingStatus: {
   type: String
 },
 approvalStatus: {
   type: String,
   enum: ['ok', 'not_ok'],
   index: true
 },
 approvalReason: {
   type: String
 },
 approvedBy: {
   type: String,
   default: null // userId who approved the meeting
 },
 attachments: {
   type: [String],
   default: [] // Array of attachment file URLs/paths
 }
}, {
 timestamps: true,
 collection: 'meetings'
});


// Create indexes for better query performance
MeetingSchema.index({ employeeId: 1, startTime: -1 });
MeetingSchema.index({ leadId: 1, startTime: -1 });
MeetingSchema.index({ status: 1, startTime: -1 });


export const Meeting = mongoose.model<IMeeting>('Meeting', MeetingSchema);



