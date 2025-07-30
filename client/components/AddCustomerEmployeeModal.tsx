import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomerEmployee, Customer } from "@shared/api";
import { AlertCircle, CheckCircle, UserPlus } from "lucide-react";

interface NewCustomerEmployeeData {
  customerName: string;
  customerEmployeeName: string;
  email: string;
  mobile: string;
  designation: string;
  department: string;
}

interface AddCustomerEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEmployee: (
    employeeData: NewCustomerEmployeeData,
  ) => Promise<{ employee: CustomerEmployee; customer: Customer } | null>;
  isLoading?: boolean;
}

export function AddCustomerEmployeeModal({
  isOpen,
  onClose,
  onAddEmployee,
  isLoading = false,
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

    // Email validation if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Mobile validation if provided
    if (
      formData.mobile &&
      !/^[\+]?[1-9][\d]{0,15}$/.test(formData.mobile.replace(/[\s\-\(\)]/g, ""))
    ) {
      newErrors.mobile = "Please enter a valid mobile number";
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
      await onAddEmployee(formData);
      handleClose();
    } catch (error) {
      console.error("Error adding customer employee:", error);
      // Error is handled by parent component
    } finally {
      setIsSubmitting(false);
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
            Create a new customer employee record. All fields marked with * are
            required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="customerName" className="text-sm">
              Customer/Company Name
              <span className="text-destructive ml-1">*</span>
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
              <span className="text-muted-foreground ml-1">(Optional)</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="employee@company.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              disabled={isFormDisabled}
              className={errors.email ? "border-destructive" : ""}
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
              <span className="text-muted-foreground ml-1">(Optional)</span>
            </Label>
            <Input
              id="mobile"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={formData.mobile}
              onChange={(e) => handleInputChange("mobile", e.target.value)}
              disabled={isFormDisabled}
              className={errors.mobile ? "border-destructive" : ""}
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
