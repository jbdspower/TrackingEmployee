import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomerEmployee, Customer } from "@shared/api";
import { AlertCircle, CheckCircle, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NewCustomerEmployeeData {
  customerName: string;
  customerEmployeeName: string;
  email: string;
  mobile: string;
  designation: string;
  department: string;
}

// CRM API configuration
const CRM_API_BASE_URL = "https://jbdspower.in/LeafNetServer/api";
const CUSTOMER_COMPANY_ID = "68340889566d91e049668f07";

interface AddCustomerEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEmployee: (
    employeeData: NewCustomerEmployeeData,
  ) => Promise<{ employee: CustomerEmployee; customer: Customer } | null>;
  isLoading?: boolean;
  defaultCustomerName?: string;
}

export function AddCustomerEmployeeModal({
  isOpen,
  onClose,
  onAddEmployee,
  isLoading = false,
  defaultCustomerName = "",
}: AddCustomerEmployeeModalProps) {
  const [formData, setFormData] = useState<NewCustomerEmployeeData>({
    customerName: "",
    customerEmployeeName: "",
    email: "",
    mobile: "",
    designation: "",
    department: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createLead, setCreateLead] = useState(false);
  const { toast } = useToast();

  // Auto-fill customer name when modal opens if defaultCustomerName is provided
  useEffect(() => {
    if (isOpen && defaultCustomerName) {
      setFormData((prev) => ({
        ...prev,
        customerName: defaultCustomerName,
      }));
    }
  }, [isOpen, defaultCustomerName]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.customerName.trim()) {
      newErrors.customerName = "Customer name is required";
    }

    if (!formData.customerEmployeeName.trim()) {
      newErrors.customerEmployeeName = "Employee name is required";
    }

    if (!formData.designation.trim()) {
      newErrors.designation = "Designation is required";
    }

    if (!formData.department.trim()) {
      newErrors.department = "Department is required";
    }

    // Email validation - now mandatory
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Mobile validation - now mandatory
    if (!formData.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (
      !/^[\+]?[1-9][\d]{9,15}$/.test(formData.mobile.replace(/[\s\-\(\)]/g, ""))
    ) {
      newErrors.mobile = "Please enter a valid mobile number (10-16 digits)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    field: keyof NewCustomerEmployeeData,
    value: string,
  ) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // First, save to CRM database
      const crmPayload = {
        CustomerEmpName: formData.customerEmployeeName,
        Department: formData.department,
        Designation: formData.designation,
        Email: formData.email,
        Mobile: formData.mobile,
      };

      console.log("Saving employee to CRM:", crmPayload);

      const crmResponse = await fetch(
        `${CRM_API_BASE_URL}/addcustomerEmployee/${CUSTOMER_COMPANY_ID}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(crmPayload),
        }
      );

      if (!crmResponse.ok) {
        const errorText = await crmResponse.text();
        console.error("CRM API error:", errorText);
        throw new Error(`Failed to save to CRM: ${crmResponse.status}`);
      }

      const crmResult = await crmResponse.json();
      console.log("Employee saved to CRM successfully:", crmResult);

      // Then, call the parent's onAddEmployee callback (if needed for local database)
      await onAddEmployee(formData);
      
      // If "Create Lead" checkbox is checked, create a lead
      if (createLead) {
        await handleCreateLead();
      }
      
      handleClose();
    } catch (error) {
      console.error("Error adding customer employee:", error);
      // Error is handled by parent component
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateLead = async () => {
    console.log("🚀 Creating lead from customer employee data");
    
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

    // Get user ID from localStorage
    const userStr = localStorage.getItem("user");
    const userId = userStr ? JSON.parse(userStr)._id : "67daa55d9c4abb36045d5bfe";

    try {
      // Prepare lead payload with only available data
      const leadPayload: any = {
        CompanyName: formData.customerName,
        Name: formData.customerEmployeeName,
        CreatedBy: userId,
        Id: `JBDSL-${Date.now().toString().slice(-4)}`, // Generate a simple ID
      };

      // Add optional fields only if they exist
      if (formData.email) {
        leadPayload.Email = formData.email;
      }
      if (formData.mobile) {
        leadPayload.Mobile = formData.mobile;
      }
      if (formData.designation) {
        leadPayload.Designation = formData.designation;
      }
      if (formData.department) {
        leadPayload.Department = formData.department;
      }

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
          description: `Lead created successfully for ${formData.customerEmployeeName} at ${formData.customerName}`,
        });
      } else {
        const errorText = await response.text();
        console.error("❌ Failed to create lead:", response.status, errorText);
        
        toast({
          title: "Failed to Create Lead",
          description: `Error: ${response.status}`,
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
    }
  };

  const handleClose = () => {
    if (isSubmitting || isLoading) return;

    setFormData({
      customerName: "",
      customerEmployeeName: "",
      email: "",
      mobile: "",
      designation: "",
      department: "",
    });
    setErrors({});
    setCreateLead(false);
    onClose();
  };

  const isFormDisabled = isSubmitting || isLoading;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <span>Add New Customer Employee</span>
          </DialogTitle>
          <DialogDescription>
            {defaultCustomerName ? (
              <>
                Create a new employee record for{" "}
                <span className="font-medium">"{defaultCustomerName}"</span>.
                The company name has been auto-filled from your current meeting.
              </>
            ) : (
              <>
                Create a new customer employee record. All fields marked with *
                are required.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="customerName" className="text-sm">
              Customer/Company Name
              <span className="text-destructive ml-1">*</span>
              {defaultCustomerName && (
                <span className="text-muted-foreground ml-2 text-xs">
                  (Auto-filled from meeting)
                </span>
              )}
            </Label>
            <Input
              id="customerName"
              type="text"
              placeholder="Enter company/customer name"
              value={formData.customerName}
              onChange={(e) =>
                handleInputChange("customerName", e.target.value)
              }
              disabled={isFormDisabled}
              className={errors.customerName ? "border-destructive" : ""}
            />
            {errors.customerName && (
              <div className="flex items-center space-x-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.customerName}</span>
              </div>
            )}
            {defaultCustomerName &&
              formData.customerName === defaultCustomerName && (
                <div className="text-xs text-muted-foreground">
                  Customer name auto-filled from "{defaultCustomerName}"
                  meeting. You can edit if needed.
                </div>
              )}
          </div>

          {/* Customer Employee Name */}
          <div className="space-y-2">
            <Label htmlFor="customerEmployeeName" className="text-sm">
              Employee Name
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Input
              id="customerEmployeeName"
              type="text"
              placeholder="Enter employee full name"
              value={formData.customerEmployeeName}
              onChange={(e) =>
                handleInputChange("customerEmployeeName", e.target.value)
              }
              disabled={isFormDisabled}
              className={
                errors.customerEmployeeName ? "border-destructive" : ""
              }
            />
            {errors.customerEmployeeName && (
              <div className="flex items-center space-x-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.customerEmployeeName}</span>
              </div>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm">
              Email Address
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="employee@company.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              disabled={isFormDisabled}
              className={errors.email ? "border-destructive" : ""}
              required
            />
            {errors.email && (
              <div className="flex items-center space-x-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.email}</span>
              </div>
            )}
          </div>

          {/* Mobile */}
          <div className="space-y-2">
            <Label htmlFor="mobile" className="text-sm">
              Mobile Number
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Input
              id="mobile"
              type="tel"
              placeholder="1234567890"
              value={formData.mobile}
              onChange={(e) => handleInputChange("mobile", e.target.value)}
              disabled={isFormDisabled}
              className={errors.mobile ? "border-destructive" : ""}
              required
            />
            {errors.mobile && (
              <div className="flex items-center space-x-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.mobile}</span>
              </div>
            )}
          </div>

          {/* Designation */}
          <div className="space-y-2">
            <Label htmlFor="designation" className="text-sm">
              Designation
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Input
              id="designation"
              type="text"
              placeholder="e.g., Manager, Director, CEO"
              value={formData.designation}
              onChange={(e) => handleInputChange("designation", e.target.value)}
              disabled={isFormDisabled}
              className={errors.designation ? "border-destructive" : ""}
            />
            {errors.designation && (
              <div className="flex items-center space-x-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.designation}</span>
              </div>
            )}
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label htmlFor="department" className="text-sm">
              Department
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Input
              id="department"
              type="text"
              placeholder="e.g., Sales, IT, HR, Operations"
              value={formData.department}
              onChange={(e) => handleInputChange("department", e.target.value)}
              disabled={isFormDisabled}
              className={errors.department ? "border-destructive" : ""}
            />
            {errors.department && (
              <div className="flex items-center space-x-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.department}</span>
              </div>
            )}
          </div>

          {/* Create Lead Checkbox */}
          <div className="flex items-center space-x-2 pt-2 pb-2 border-t">
            <Checkbox
              id="createLead"
              checked={createLead}
              onCheckedChange={(checked) => setCreateLead(checked as boolean)}
              disabled={isFormDisabled}
            />
            <Label
              htmlFor="createLead"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Create Lead after adding employee
            </Label>
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
              disabled={isFormDisabled}
              className="min-w-[120px]"
            >
              {isSubmitting || isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Adding...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Add Employee</span>
                </div>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export type { NewCustomerEmployeeData };
