// Existing demo interface
export interface DemoResponse {
  message: string;
}

// Employee tracking interfaces
export interface LocationData {
  lat: number;
  lng: number;
  address: string;
  timestamp: string;
}

// External API User structure
export interface ExternalUser {
  _id: string;
  target: number;
  name: string;
  email: string;
  companyName: Array<{
    companyName: string;
    _id: string;
  }>;
  report: {
    _id: string;
    name: string;
  };
  designation: string;
  department: string;
  mobileNumber: string;
}

// Internal Employee structure (mapped from external API)
export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "meeting";
  location: LocationData;
  lastUpdate: string;
  currentTask?: string;
  deviceId?: string;
  designation?: string;
  department?: string;
  companyName?: string;
  reportTo?: string;
}

export interface LocationUpdate {
  employeeId: string;
  location: {
    lat: number;
    lng: number;
  };
  timestamp: string;
  accuracy?: number;
}

// Enhanced tracking session data
export interface TrackingSession {
  id: string;
  employeeId: string;
  startTime: string;
  endTime?: string;
  startLocation: LocationData;
  endLocation?: LocationData;
  route: LocationData[]; // Array of coordinates for route
  totalDistance: number; // in meters
  duration?: number; // in seconds
  status: "active" | "completed";
}

// Individual customer contact details
export interface CustomerContact {
  customerName: string;
  customerEmployeeName: string;
  customerEmail?: string;
  customerMobile?: string;
  customerDesignation?: string;
  customerDepartment?: string;
}

// Enhanced meeting data with multiple customer contacts
export interface MeetingDetails {
  customers: CustomerContact[]; // Array of customer contacts
  discussion: string; // mandatory

  // Legacy fields for backward compatibility
  customerName?: string;
  customerEmployeeName?: string;
  customerEmail?: string;
  customerMobile?: string;
  customerDesignation?: string;
  customerDepartment?: string;
}

export interface MeetingLog {
  id: string;
  employeeId: string;
  location: LocationData;
  startTime: string;
  endTime?: string;
  clientName?: string;
  notes?: string;
  status: "started" | "in-progress" | "completed";
  trackingSessionId?: string;
  leadId?: string; // Associated lead ID
  leadInfo?: {
    id: string;
    companyName: string;
    contactName: string;
  };
  meetingDetails?: MeetingDetails;
}

// API Response types
export interface EmployeesResponse {
  employees: Employee[];
  total: number;
}

export interface LocationUpdateResponse {
  success: boolean;
  employee: Employee;
}

export interface MeetingLogsResponse {
  meetings: MeetingLog[];
  total: number;
}

export interface CreateMeetingRequest {
  employeeId: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  clientName?: string;
  notes?: string;
  trackingSessionId?: string;
}

// New interfaces for enhanced functionality
export interface TrackingSessionResponse {
  sessions: TrackingSession[];
  total: number;
}

export interface EndMeetingRequest {
  meetingDetails: MeetingDetails;
}

export interface MeetingHistoryResponse {
  meetings: MeetingLog[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UpdateLocationRequest {
  lat: number;
  lng: number;
  accuracy?: number;
}

// Customer employee interfaces from external API
export interface CustomerAddress {
  _id: string;
  StreetAddress: string;
  City: string;
  State: string;
  PinCode: string;
  Country: string;
}

export interface CustomerEmployee {
  _id: string;
  CustomerEmpName: string;
  Designation: string;
  Department: string;
  Mobile: string;
  Email: string;
}

export interface LedgerType {
  _id: string;
  Name: string;
  __v: number;
}

export interface Dealer {
  _id: string;
  Name: string;
  __v: number;
}

export interface Mode {
  _id: string;
  Name: string;
  __v: number;
}

export interface CompanyName {
  _id: string;
  companyName: string;
  __v: number;
}

export interface BankDetails {
  AccountholderName: string;
  AccountNumber: string;
  IFSC: string;
  BankName: string;
  BranchName: string;
  AccountType: string;
}

// Lead management interfaces
export interface LeadCategory {
  _id: string;
  name: string;
  __v: number;
}

export interface Lead {
  _id: string;
  QuotaionDate: string;
  StarIcon: boolean;
  FollowIcon: boolean;
  AssignPerson: string[];
  Id: string; // Lead ID like "JBDSL-0001"
  ClosureDate: string;
  CompanyName: string;
  Name: string;
  Mobile: number;
  Email: string;
  Pin: string;
  Address: string;
  Department: string;
  Designation: string;
  LeadCategory: LeadCategory;
  Subject: string;
  State: string;
  City: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  Stage?: string;
  Source?: string;
}

export interface Customer {
  _id: string;
  GstNumber: string;
  Status: string;
  CustomerCompanyName: string;
  RJBDSName: string;
  LedgerType: LedgerType;
  Dealer: Dealer;
  Mode: Mode;
  CompanyName: CompanyName;
  Addresses: CustomerAddress[];
  Employees: CustomerEmployee[];
  Gst: string;
  BusinessType: string;
  AdharNumber: string;
  PanNumber: string;
  ImportExportCode: string;
  WhatsappNumber: string;
  OpBalance: number;
  BankDetails: BankDetails;
  UploadGSTCertificate: string | null;
  UploadAdharCardFront: string | null;
  UploadAdharCardBack: string | null;
  UploadPanCard: string | null;
  CancelledCheque: string | null;
  DistributorAuthorizedCertificate: string | null;
  UploadImportExportCertificate: string | null;
  CustomerId: string;
  CustomerStatus: string;
  updatedAt: string;
  __v: number;
}

export interface CustomerApiResponse {
  customers: Customer[];
}

// Enhanced meeting details with customer employee selection
export interface EnhancedMeetingDetails extends MeetingDetails {
  selectedCustomerId?: string;
  selectedCustomerEmployeeId?: string;
  selectedCustomerEmployee?: CustomerEmployee;
}
