import { useState, useRef } from "react";
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
import { MeetingDetails, CustomerEmployee, Customer, CustomerContact } from "@shared/api";
import { AlertCircle, CheckCircle, Clock, User, Building2 } from "lucide-react";
import {
  CustomerEmployeeSelector,
  CustomerEmployeeSelectorRef,
} from "./CustomerEmployeeSelector";
import {
  AddCustomerEmployeeModal,
  NewCustomerEmployeeData,
} from "./AddCustomerEmployeeModal";

interface EndMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEndMeeting: (meetingDetails: MeetingDetails) => Promise<void>;
  employeeName: string;
  isLoading?: boolean;
}

export function EndMeetingModal({
  isOpen,
  onClose,
  onEndMeeting,
  employeeName,
  isLoading = false,
}: EndMeetingModalProps) {
  const [formData, setFormData] = useState<MeetingDetails>({
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

  // Multiple customer selection state
  const [selectedCustomers, setSelectedCustomers] = useState<CustomerContact[]>([]);
  const [currentSelectedEmployee, setCurrentSelectedEmployee] =
    useState<CustomerEmployee | null>(null);
  const [currentSelectedCustomer, setCurrentSelectedCustomer] =
    useState<Customer | null>(null);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);

  // Ref for customer employee selector
  const customerSelectorRef = useRef<CustomerEmployeeSelectorRef>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // At least one customer is mandatory
    if (selectedCustomers.length === 0) {
      newErrors.customers = "Please add at least one customer contact";
    }

    // Discussion is mandatory
    if (!formData.discussion.trim()) {
      newErrors.discussion = "Discussion details are required";
    }

    // Email validation if provided
    if (
      formData.customerEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)
    ) {
      newErrors.customerEmail = "Please enter a valid email address";
    }

    // Mobile validation if provided
    if (
      formData.customerMobile &&
      !/^[\+]?[1-9][\d]{0,15}$/.test(
        formData.customerMobile.replace(/[\s\-\(\)]/g, ""),
      )
    ) {
      newErrors.customerMobile = "Please enter a valid mobile number";
    }

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
      customerEmail: employee.Email || "",
      customerMobile: employee.Mobile || "",
      customerDesignation: employee.Designation || "",
      customerDepartment: employee.Department || "",
    };

    // Check if this customer is already added
    const isAlreadyAdded = selectedCustomers.some(
      (c) => c.customerName === customerContact.customerName &&
             c.customerEmployeeName === customerContact.customerEmployeeName
    );

    if (!isAlreadyAdded) {
      const newSelectedCustomers = [...selectedCustomers, customerContact];
      setSelectedCustomers(newSelectedCustomers);

      // Update form data with all customers
      setFormData(prev => ({
        ...prev,
        customers: newSelectedCustomers,
        // Keep legacy fields for the first customer for backward compatibility
        customerName: newSelectedCustomers[0]?.customerName || "",
        customerEmployeeName: newSelectedCustomers[0]?.customerEmployeeName || "",
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
    const newSelectedCustomers = selectedCustomers.filter((_, i) => i !== index);
    setSelectedCustomers(newSelectedCustomers);

    // Update form data
    setFormData(prev => ({
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

    console.log("EndMeetingModal: Removed customer from list, remaining:", newSelectedCustomers.length);
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

    console.log("EndMeetingModal: Form data before validation:", formData);
    console.log("EndMeetingModal: Selected customers:", selectedCustomers);

    if (!validateForm()) {
      console.log("EndMeetingModal: Form validation failed");
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("EndMeetingModal: Submitting form data:", formData);
      console.log("EndMeetingModal: Selected customers:", selectedCustomers);
      await onEndMeeting(formData);
      console.log("Meeting ended successfully, clearing temp employees");
      // Clear temporary employees after successful meeting end
      if (customerSelectorRef.current) {
        customerSelectorRef.current.clearTempEmployees();
      }
      handleClose();
    } catch (error) {
      console.error("Error ending meeting:", error);
      // Error is handled by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting || isLoading) return;

    console.log("EndMeetingModal: Closing and resetting all state");

    // Reset all form state
    setFormData({
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

    // Reset the customer employee selector and clear any temporary employees
    if (customerSelectorRef.current) {
      customerSelectorRef.current.resetSelection();
    }

    onClose();
  };

  const isFormDisabled = isSubmitting || isLoading;

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
            <CustomerEmployeeSelector
              ref={customerSelectorRef}
              onEmployeeSelect={handleCustomerEmployeeSelect}
              selectedEmployeeId={currentSelectedEmployee?._id}
              disabled={isFormDisabled}
              onAddNewEmployee={() => setIsAddEmployeeOpen(true)}
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
                    <div key={index} className="p-3 border rounded-lg bg-muted/20 relative">
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
                          <span className="text-muted-foreground">Company:</span>
                          <div className="font-medium">{customer.customerName}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Contact:</span>
                          <div className="font-medium">{customer.customerEmployeeName}</div>
                        </div>
                        {customer.customerDesignation && (
                          <div>
                            <span className="text-muted-foreground">Position:</span>
                            <div>{customer.customerDesignation}</div>
                          </div>
                        )}
                        {customer.customerDepartment && (
                          <div>
                            <span className="text-muted-foreground">Department:</span>
                            <div>{customer.customerDepartment}</div>
                          </div>
                        )}
                        {customer.customerEmail && (
                          <div>
                            <span className="text-muted-foreground">Email:</span>
                            <div className="text-xs">{customer.customerEmail}</div>
                          </div>
                        )}
                        {customer.customerMobile && (
                          <div>
                            <span className="text-muted-foreground">Mobile:</span>
                            <div className="text-xs">{customer.customerMobile}</div>
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

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
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
        </form>

        {/* Add Customer Employee Modal */}
        <AddCustomerEmployeeModal
          isOpen={isAddEmployeeOpen}
          onClose={() => setIsAddEmployeeOpen(false)}
          onAddEmployee={handleAddNewEmployee}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
