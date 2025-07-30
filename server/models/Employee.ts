import mongoose, { Schema, Document } from 'mongoose';

// Location interface
interface Location {
  lat: number;
  lng: number;
  address: string;
  timestamp: string;
}

// Employee document interface
export interface IEmployee extends Document {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive' | 'meeting';
  location?: Location;
  lastUpdate?: string;
  currentTask?: string;
  deviceId?: string;
  designation?: string;
  department?: string;
  companyName?: string;
  reportTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Location schema
const LocationSchema = new Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, required: true },
  timestamp: { type: String, required: true }
});

// Employee schema
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
    enum: ['active', 'inactive', 'meeting'],
    default: 'inactive',
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
  collection: 'employees'
});

// Create indexes for better query performance
EmployeeSchema.index({ status: 1, name: 1 });
EmployeeSchema.index({ companyName: 1, department: 1 });
EmployeeSchema.index({ name: 'text', email: 'text' }); // Text search index

export const Employee = mongoose.model<IEmployee>('Employee', EmployeeSchema);
