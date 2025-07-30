import mongoose, { Schema, Document } from 'mongoose';

// Attendance document interface
export interface IAttendance extends Document {
  employeeId: string;
  date: string; // YYYY-MM-DD format
  attendanceStatus: 'full_day' | 'half_day' | 'off' | 'short_leave' | 'ot';
  attendanceReason: string;
  createdAt: Date;
  updatedAt: Date;
}

// Attendance schema
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
    match: /^\d{4}-\d{2}-\d{2}$/ // YYYY-MM-DD format validation
  },
  attendanceStatus: { 
    type: String, 
    enum: ['full_day', 'half_day', 'off', 'short_leave', 'ot'],
    required: true,
    default: 'full_day'
  },
  attendanceReason: { 
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  collection: 'attendance'
});

// Create compound unique index to prevent duplicate attendance records for same employee-date
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

// Create indexes for better query performance
AttendanceSchema.index({ employeeId: 1, date: -1 });
AttendanceSchema.index({ date: -1, attendanceStatus: 1 });

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);
