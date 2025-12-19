import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MeetingDetails,
  CustomerEmployee,
  Customer,
  CustomerContact,
} from "@shared/api";
import { AlertCircle, CheckCircle, Clock, User, Building2, UserPlus, Paperclip, X } from "lucide-react";
import {
  CustomerEmployeeSelector,
  CustomerEmployeeSelectorRef,
} from "./CustomerEmployeeSelector";
import {
  AddCustomerEmployeeModal,
  NewCustomerEmployeeData,
} from "./AddCustomerEmployeeModal";
import { useToast } from "@/hooks/use-toast";

interface EndMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEndMeeting: (meetingDetails: MeetingDetails) => Promise<void>;
  employeeName: string;
  isLoading?: boolean;
  currentMeeting?: {
    clientName?: string;
    id: string;
  } | null;
  followUpMeetingData?: {
    _id: string;
    customerName: string;
    customerEmail: string;
    customerMobile: string;
    customerDesignation: string;
    companyName: string;
    remark: string;
    type: string;
  } | null;
}

export function EndMeetingModal({
  isOpen,
  onClose,
  onEndMeeting,
  employeeName,
  isLoading = false,
  currentMeeting = null,
  followUpMeetingData = null,
}: EndMeetingModalProps) {
  const [formData, setFormData] = useState<MeetingDetails>({
    incomplete: false,
    customers: [],
    discussion: "",
    // Legacy fields for backward compatibility
    customerName: "",
    customerEmployeeName: "",
    customerEmail: "",
    customerMobile: "",
    customerDesignation: "",
    customerDepartment: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingLead, setIsCreatingLead] = useState(false);

  // Multiple customer selection state
  const [selectedCustomers, setSelectedCustomers] = useState<CustomerContact[]>(
    [],
  );
  const [currentSelectedEmployee, setCurrentSelectedEmployee] =
    useState<CustomerEmployee | null>(null);
  const [currentSelectedCustomer, setCurrentSelectedCustomer] =
    useState<Customer | null>(null);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);

  // Ref for customer employee selector
  const customerSelectorRef = useRef<CustomerEmployeeSelectorRef>(null);
  
  // File attachment state
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  // Prefill form with follow-up meeting data when modal opens
  useEffect(() => {
    if (isOpen && followUpMeetingData) {
      console.log("📋 Prefilling form with follow-up meeting data:", followUpMeetingData);
      
      // Create customer contact from follow-up data
      const customerContact: CustomerContact = {
        customerName: followUpMeetingData.companyName,
        customerEmployeeName: followUpMeetingData.customerName,
        customerEmail: followUpMeetingData.customerEmail || "",
        customerMobile: String(followUpMeetingData.customerMobile || ""),
        customerDesignation: followUpMeetingData.customerDesignation || "",
        customerDepartment: "",
      };

      console.log("✅ Created customer contact from follow-up:", customerContact);
      
      setSelectedCustomers([customerContact]);
      setFormData(prev => {
        const newData = {
          ...prev,
          customers: [customerContact],
          customerName: followUpMeetingData.companyName,
          customerEmployeeName: followUpMeetingData.customerName,
          customerEmail: followUpMeetingData.customerEmail || "",
          customerMobile: String(followUpMeetingData.customerMobile || ""),
          customerDesignation: followUpMeetingData.customerDesignation || "",
          customerDepartment: "",
        };
        console.log("✅ Updated formData with customer:", newData);
        return newData;
      });
      
      console.log("✅ Form prefilled with customer data");
    } else if (isOpen && !followUpMeetingData) {
      console.log("⚠️ Modal opened but no followUpMeetingData provided");
    }
  }, [isOpen, followUpMeetingData]);
  
  // Debug: Log when selectedCustomers changes
  useEffect(() => {
    console.log("🔄 selectedCustomers changed:", selectedCustomers.length, selectedCustomers);
  }, [selectedCustomers]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    console.log("Validating form with selectedCustomers:", selectedCustomers.length);
    console.log("Form data customers:", formData.customers?.length);

    // At least one customer is mandatory
    if (selectedCustomers.length === 0) {
      newErrors.customers = "Please add at least one customer contact";
      console.log("Validation failed: No customers selected");
    }

    // Validate each customer in the array
    selectedCustomers.forEach((customer, index) => {
      // Email validation if provided (only validate if not empty)
      if (
        customer.customerEmail &&
        customer.customerEmail.trim() !== "" &&
        typeof customer.customerEmail === 'string' &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.customerEmail)
      ) {
        newErrors[`customer_${index}_email`] = `Invalid email for ${customer.customerEmployeeName}`;
        console.log(`Validation failed: Invalid email for customer ${index}`);
      }

      // Mobile validation if provided (only validate if not empty)
      if (
        customer.customerMobile &&
        customer.customerMobile.trim() !== "" &&
        typeof customer.customerMobile === 'string' &&
        customer.customerMobile.length > 0
      ) {
        // Remove formatting characters for validation
        const cleanMobile = customer.customerMobile.replace(/[\s\-\(\)]/g, "");
        // More lenient mobile validation - just check if it has digits
        if (!/^\+?\d{7,15}$/.test(cleanMobile)) {
          newErrors[`customer_${index}_mobile`] = `Invalid mobile for ${customer.customerEmployeeName}`;
          console.log(`Validation failed: Invalid mobile for customer ${index}:`, customer.customerMobile);
        }
      }
    });

    // Discussion is mandatory
    if (!formData.discussion.trim()) {
      newErrors.discussion = "Discussion details are required";
      console.log("Validation failed: No discussion provided");
    }

    // Legacy field validation for backward compatibility (only if provided)
    // Email validation if provided
    if (
      formData.customerEmail &&
      formData.customerEmail.trim() !== "" &&
      typeof formData.customerEmail === 'string' &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)
    ) {
      newErrors.customerEmail = "Please enter a valid email address";
    }

    // Mobile validation if provided
    if (
      formData.customerMobile &&
      formData.customerMobile.trim() !== "" &&
      typeof formData.customerMobile === 'string'
    ) {
      const cleanMobile = formData.customerMobile.replace(/[\s\-\(\)]/g, "");
      if (!/^\+?\d{7,15}$/.test(cleanMobile)) {
        newErrors.customerMobile = "Please enter a valid mobile number";
      }
    }

    console.log("Validation errors:", newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof MeetingDetails, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle customer employee selection (adds to list)
  const handleCustomerEmployeeSelect = (
    employee: CustomerEmployee,
    customer: Customer,
  ) => {
    console.log("EndMeetingModal: Customer employee selected:", employee);
    console.log("EndMeetingModal: Customer selected:", customer);

    setCurrentSelectedEmployee(employee);
    setCurrentSelectedCustomer(customer);

    // Create customer contact object
    const customerContact: CustomerContact = {
      customerName: customer.CustomerCompanyName,
      customerEmployeeName: employee.CustomerEmpName,
      customerEmail: String(employee.Email || ""),
      customerMobile: String(employee.Mobile || ""),
      customerDesignation: String(employee.Designation || ""),
      customerDepartment: String(employee.Department || ""),
    };

    // Check if this customer is already added
    const isAlreadyAdded = selectedCustomers.some(
      (c) =>
        c.customerName === customerContact.customerName &&
        c.customerEmployeeName === customerContact.customerEmployeeName,
    );

    if (!isAlreadyAdded) {
      const newSelectedCustomers = [...selectedCustomers, customerContact];
      setSelectedCustomers(newSelectedCustomers);

      // Update form data with all customers
      setFormData((prev) => ({
        ...prev,
        customers: newSelectedCustomers,
        // Keep legacy fields for the first customer for backward compatibility
        customerName: newSelectedCustomers[0]?.customerName || "",
        customerEmployeeName:
          newSelectedCustomers[0]?.customerEmployeeName || "",
        customerEmail: newSelectedCustomers[0]?.customerEmail || "",
        customerMobile: newSelectedCustomers[0]?.customerMobile || "",
        customerDesignation: newSelectedCustomers[0]?.customerDesignation || "",
        customerDepartment: newSelectedCustomers[0]?.customerDepartment || "",
      }));

      console.log("EndMeetingModal: Added customer to list:", customerContact);

      // Reset current selection after adding
      setCurrentSelectedEmployee(null);
      setCurrentSelectedCustomer(null);
    } else {
      console.log("EndMeetingModal: Customer already in list, skipping");
    }
  };

  // Remove customer from selected list
  const handleRemoveCustomer = (index: number) => {
    const newSelectedCustomers = selectedCustomers.filter(
      (_, i) => i !== index,
    );
    setSelectedCustomers(newSelectedCustomers);

    // Update form data
    setFormData((prev) => ({
      ...prev,
      customers: newSelectedCustomers,
      // Update legacy fields for the first customer
      customerName: newSelectedCustomers[0]?.customerName || "",
      customerEmployeeName: newSelectedCustomers[0]?.customerEmployeeName || "",
      customerEmail: newSelectedCustomers[0]?.customerEmail || "",
      customerMobile: newSelectedCustomers[0]?.customerMobile || "",
      customerDesignation: newSelectedCustomers[0]?.customerDesignation || "",
      customerDepartment: newSelectedCustomers[0]?.customerDepartment || "",
    }));

    console.log(
      "EndMeetingModal: Removed customer from list, remaining:",
      newSelectedCustomers.length,
    );
  };

  // Handle adding new customer employee
  const handleAddNewEmployee = async (
    employeeData: NewCustomerEmployeeData,
  ) => {
    try {
      // Create a new customer employee object with generated ID
      const newEmployeeId = `temp_${Date.now()}`;
      const newEmployee: CustomerEmployee = {
        _id: newEmployeeId,
        CustomerEmpName: employeeData.customerEmployeeName,
        Designation: employeeData.designation,
        Department: employeeData.department,
        Mobile: employeeData.mobile,
        Email: employeeData.email,
      };

      // Create a temporary customer object if it's a new company
      const newCustomer: Customer = {
        _id: `temp_customer_${Date.now()}`,
        CustomerCompanyName: employeeData.customerName,
        Employees: [newEmployee],
        // Fill in other required fields with defaults
        GstNumber: "",
        Status: "Active",
        RJBDSName: "",
        LedgerType: { _id: "", Name: "", __v: 0 },
        Dealer: { _id: "", Name: "", __v: 0 },
        Mode: { _id: "", Name: "", __v: 0 },
        CompanyName: {
          _id: "",
          companyName: employeeData.customerName,
          __v: 0,
        },
        Addresses: [],
        Gst: "",
        BusinessType: "",
        AdharNumber: "",
        PanNumber: "",
        ImportExportCode: "",
        WhatsappNumber: "",
        OpBalance: 0,
        BankDetails: {
          AccountholderName: "",
          AccountNumber: "",
          IFSC: "",
          BankName: "",
          BranchName: "",
          AccountType: "",
        },
        UploadGSTCertificate: null,
        UploadAdharCardFront: null,
        UploadAdharCardBack: null,
        UploadPanCard: null,
        CancelledCheque: null,
        DistributorAuthorizedCertificate: null,
        UploadImportExportCertificate: null,
        CustomerId: "",
        CustomerStatus: "Temporary",
        updatedAt: new Date().toISOString(),
        __v: 0,
      };

      console.log("Creating new customer employee:", employeeData);
      console.log("Generated employee object:", newEmployee);
      console.log("Generated customer object:", newCustomer);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Add the new employee to the selector immediately
      if (customerSelectorRef.current) {
        console.log("Adding temp employee to selector...");
        customerSelectorRef.current.addTempEmployee(
          newEmployee,
          employeeData.customerName,
          newCustomer._id,
        );
        console.log("Temp employee added to selector");
      } else {
        console.error("customerSelectorRef.current is null!");
      }

      // Automatically select the newly created employee
      setTimeout(() => {
        console.log("Auto-selecting newly created employee...");
        handleCustomerEmployeeSelect(newEmployee, newCustomer);
      }, 100);

      console.log("Customer employee added successfully!");
      return { employee: newEmployee, customer: newCustomer };
    } catch (error) {
      console.error("Error adding customer employee:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("🔵 EndMeetingModal: Form submit triggered");
    console.log("EndMeetingModal: Form data before validation:", formData);
    console.log("EndMeetingModal: Selected customers:", selectedCustomers);
    console.log("EndMeetingModal: Discussion:", formData.discussion);

    const isValid = validateForm();
    console.log("EndMeetingModal: Validation result:", isValid);
    
    if (!isValid) {
      console.log("EndMeetingModal: Form validation failed with errors:", errors);
      // Scroll to first error
      const firstErrorElement = document.querySelector('.border-destructive');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    console.log("✅ EndMeetingModal: Validation passed, submitting...");
    setIsSubmitting(true);
    try {
      console.log("EndMeetingModal: Calling onEndMeeting with form data:", formData);
      await onEndMeeting(formData);
      console.log("✅ Meeting ended successfully, clearing temp employees");
      // Clear temporary employees after successful meeting end
      if (customerSelectorRef.current) {
        customerSelectorRef.current.clearTempEmployees();
      }
      handleClose();
    } catch (error) {
      console.error("❌ Error ending meeting:", error);
      // Error is handled by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateLead = async () => {
    console.log("🚀 Creating lead from meeting data");
    
    // Validate that we have at least one customer selected
    if (selectedCustomers.length === 0) {
      toast({
        title: "No Customer Selected",
        description: "Please select at least one customer to create a lead.",
        variant: "destructive",
      });
      return;
    }

    // Get the first customer for lead creation
    const customer = selectedCustomers[0];
    
    // Get token from localStorage
    const token = localStorage.getItem("idToken");
    
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "No authentication token found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    // Get user ID from localStorage (assuming it's stored)
    const userId = localStorage.getItem("userId") || "67daa55d9c4abb36045d5bfe";

    setIsCreatingLead(true);
    
    try {
      // Prepare lead payload
      const leadPayload = {
        CompanyName: customer.customerName,
        Name: customer.customerEmployeeName,
        Email: customer.customerEmail || "",
        Mobile: customer.customerMobile || "",
        Designation: customer.customerDesignation || "",
        Department: customer.customerDepartment || "purchase",
        CreatedBy: userId,
        Id: `JBDSL-${Date.now().toString().slice(-4)}`, // Generate a simple ID
      };

      console.log("📤 Sending lead creation request:", leadPayload);

      // Make API call to create lead
      const response = await fetch(
        `https://jbdspower.in/LeafNetServer/api/createLead?auth=${token}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(leadPayload),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Lead created successfully:", result);
        
        toast({
          title: "Lead Created",
          description: `Lead created successfully for ${customer.customerEmployeeName} at ${customer.customerName}`,
        });
      } else {
        const errorText = await response.text();
        console.error("❌ Failed to create lead:", response.status, errorText);
        
        toast({
          title: "Failed to Create Lead",
          description: `Error: ${response.status} - ${errorText.substring(0, 100)}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("❌ Error creating lead:", error);
      toast({
        title: "Error",
        description: "Failed to create lead. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingLead(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setAttachedFiles(prev => [...prev, ...newFiles]);
      console.log("📎 Files attached:", newFiles.map(f => f.name));
      
      toast({
        title: "Files Attached",
        description: `${newFiles.length} file(s) attached successfully`,
      });
    }
    
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    console.log("🗑️ File removed at index:", index);
  };

  const handleClose = () => {
    if (isSubmitting || isLoading) {
      console.log("⚠️ Cannot close: Form is submitting or loading");
      return;
    }

    console.log("🔴 EndMeetingModal: Closing and resetting all state");

    // Reset all form state
    setFormData({
      incomplete: false,
      customers: [],
      discussion: "",
      // Legacy fields
      customerName: "",
      customerEmployeeName: "",
      customerEmail: "",
      customerMobile: "",
      customerDesignation: "",
      customerDepartment: "",
    });
    setErrors({});
    setSelectedCustomers([]);
    setCurrentSelectedEmployee(null);
    setCurrentSelectedCustomer(null);
    setIsAddEmployeeOpen(false);
    setAttachedFiles([]);

    // Reset the customer employee selector and clear any temporary employees
    if (customerSelectorRef.current) {
      customerSelectorRef.current.resetSelection();
    }

    onClose();
  };

  const isFormDisabled = isSubmitting || isLoading || isCreatingLead;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md  max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-destructive" />
            <span>End Meeting</span>
          </DialogTitle>
          <DialogDescription>
            Complete the meeting for{" "}
            <span className="font-medium">{employeeName}</span> by providing
            customer details and discussion summary.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Employee Selection Header */}
          <div className="flex items-center space-x-2 py-2 border-b">
            <User className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              Select Customer Employee
            </span>
          </div>

          {/* Customer Employee Selection */}
          <div className="space-y-4">
            {currentMeeting?.clientName && (
              <div className="bg-primary/5 p-3 rounded-md text-sm">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">
                    Meeting with: {currentMeeting.clientName}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Showing employees for this company only
                </div>
              </div>
            )}
            <CustomerEmployeeSelector
              ref={customerSelectorRef}
              onEmployeeSelect={handleCustomerEmployeeSelect}
              selectedEmployeeId={currentSelectedEmployee?._id}
              disabled={isFormDisabled}
              onAddNewEmployee={() => setIsAddEmployeeOpen(true)}
              filterByCompany={currentMeeting?.clientName}
            />
            {errors.customers && (
              <div className="flex items-center space-x-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.customers}</span>
              </div>
            )}

            {/* Selected Customers List */}
            {selectedCustomers.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">
                    Selected Customer Contacts ({selectedCustomers.length})
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedCustomers.map((customer, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg bg-muted/20 relative"
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveCustomer(index)}
                        className="absolute top-2 right-2 h-6 w-6 p-0 text-destructive hover:text-destructive"
                        disabled={isFormDisabled}
                      >
                        ×
                      </Button>

                      <div className="grid grid-cols-2 gap-2 text-sm pr-8">
                        <div>
                          <span className="text-muted-foreground">
                            Company:
                          </span>
                          <div className="font-medium">
                            {customer.customerName}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Contact:
                          </span>
                          <div className="font-medium">
                            {customer.customerEmployeeName}
                          </div>
                        </div>
                        {customer.customerDesignation && (
                          <div>
                            <span className="text-muted-foreground">
                              Position:
                            </span>
                            <div>{customer.customerDesignation}</div>
                          </div>
                        )}
                        {customer.customerDepartment && (
                          <div>
                            <span className="text-muted-foreground">
                              Department:
                            </span>
                            <div>{customer.customerDepartment}</div>
                          </div>
                        )}
                        {customer.customerEmail && (
                          <div>
                            <span className="text-muted-foreground">
                              Email:
                            </span>
                            <div className="text-xs">
                              {customer.customerEmail}
                            </div>
                          </div>
                        )}
                        {customer.customerMobile && (
                          <div>
                            <span className="text-muted-foreground">
                              Mobile:
                            </span>
                            <div className="text-xs">
                              {customer.customerMobile}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Discussion - Mandatory */}
          <div className="space-y-2">
            <Label htmlFor="discussion" className="text-sm">
              Discussion Details
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Textarea
              id="discussion"
              placeholder="Describe what was discussed in the meeting, key points, outcomes, and next steps..."
              value={formData.discussion}
              onChange={(e) => handleInputChange("discussion", e.target.value)}
              disabled={isFormDisabled}
              rows={4}
              className={errors.discussion ? "border-destructive" : ""}
            />
            {errors.discussion && (
              <div className="flex items-center space-x-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.discussion}</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              This field is required and will be included in the meeting record.
            </div>
          </div>

          {/* File Attachment */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center space-x-2">
              <Paperclip className="h-4 w-4" />
              <span>Attach Files (Optional)</span>
            </Label>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              disabled={isFormDisabled}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            />
            
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isFormDisabled}
              className="w-full"
            >
              <Paperclip className="h-4 w-4 mr-2" />
              Choose Files
            </Button>

            {/* Attached Files List */}
            {attachedFiles.length > 0 && (
              <div className="space-y-2 mt-2">
                <div className="text-xs text-muted-foreground">
                  {attachedFiles.length} file(s) attached
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {attachedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 border rounded bg-muted/20"
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs truncate" title={file.name}>
                          {file.name}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(index)}
                        disabled={isFormDisabled}
                        className="h-6 w-6 p-0 ml-2 flex-shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCreateLead}
              disabled={isFormDisabled || selectedCustomers.length === 0}
              className="min-w-[120px]"
            >
              {isCreatingLead ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  <span>Creating...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <UserPlus className="h-4 w-4" />
                  <span>Create Lead</span>
                </div>
              )}
            </Button>
            
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isFormDisabled}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isFormDisabled}
                className="min-w-[120px]"
              >
                {isSubmitting || isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Ending...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>End Meeting</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Add Customer Employee Modal */}
        <AddCustomerEmployeeModal
          isOpen={isAddEmployeeOpen}
          onClose={() => setIsAddEmployeeOpen(false)}
          onAddEmployee={handleAddNewEmployee}
          isLoading={isLoading}
          defaultCustomerName={currentMeeting?.clientName}
        />
      </DialogContent>
    </Dialog>
  );
}
