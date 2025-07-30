import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Customer, CustomerEmployee } from "@shared/api";
import { Loader2, Plus, AlertCircle } from "lucide-react";

interface CustomerEmployeeSelectorProps {
  onEmployeeSelect: (employee: CustomerEmployee, customer: Customer) => void;
  selectedEmployeeId?: string;
  disabled?: boolean;
  onAddNewEmployee?: () => void;
}

export interface CustomerEmployeeSelectorRef {
  refreshCustomers: () => Promise<void>;
  addTempEmployee: (
    employee: CustomerEmployee,
    customerName: string,
    customerId: string,
  ) => void;
  clearTempEmployees: () => void;
  resetSelection: () => void;
}

export const CustomerEmployeeSelector = forwardRef<
  CustomerEmployeeSelectorRef,
  CustomerEmployeeSelectorProps
>(
  (
    {
      onEmployeeSelect,
      selectedEmployeeId,
      disabled = false,
      onAddNewEmployee,
    },
    ref,
  ) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [employees, setEmployees] = useState<
      Array<CustomerEmployee & { customerName: string; customerId: string }>
    >([]);
    const [tempEmployees, setTempEmployees] = useState<
      Array<CustomerEmployee & { customerName: string; customerId: string }>
    >([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch customers from external API
    const fetchCustomers = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          "https://jbdspower.in/LeafNetServer/api/customer",
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch customers: ${response.statusText}`);
        }
        const data = await response.json();

        // The API returns an array directly
        const customerArray = Array.isArray(data) ? data : [];
        setCustomers(customerArray);

        // Flatten all employees with customer info
        const allEmployees = customerArray.flatMap((customer: Customer) =>
          (customer.Employees || []).map((employee) => ({
            ...employee,
            customerName: customer.CustomerCompanyName,
            customerId: customer._id,
          })),
        );
        setEmployees(allEmployees);
      } catch (err) {
        console.error("Error fetching customers:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch customers",
        );
      } finally {
        setLoading(false);
      }
    };

    // Add temporary employee - declared before useEffect that uses it
    const addTempEmployee = (
      employee: CustomerEmployee,
      customerName: string,
      customerId: string,
    ) => {
      const tempEmployee = {
        ...employee,
        customerName,
        customerId,
      };

      console.log("Adding temporary employee:", tempEmployee);

      setTempEmployees((prev) => {
        const updated = [...prev, tempEmployee];
        // Persist to localStorage
        try {
          localStorage.setItem(
            "tempCustomerEmployees",
            JSON.stringify(updated),
          );
        } catch (error) {
          console.error("Error saving temporary employees:", error);
        }
        console.log("Updated temp employees:", updated);
        return updated;
      });
    };

    useEffect(() => {
      fetchCustomers();
    }, []);

    // Debug effect for tempEmployees changes
    useEffect(() => {
      console.log("tempEmployees changed:", tempEmployees);
    }, [tempEmployees]);

    // Debug: expose functions to window for testing
    useEffect(() => {
      if (typeof window !== "undefined") {
        (window as any).debugCustomerSelector = {
          getTempEmployees: () => tempEmployees,
          getEmployees: () => employees,
          addTestEmployee: () => {
            const testEmployee: CustomerEmployee = {
              _id: `temp_test_${Date.now()}`,
              CustomerEmpName: "Test Employee",
              Designation: "Test Position",
              Department: "Test Dept",
              Mobile: "1234567890",
              Email: "test@test.com",
            };
            addTempEmployee(
              testEmployee,
              "Test Company",
              `temp_customer_${Date.now()}`,
            );
          },
        };
      }
    }, [tempEmployees, employees, addTempEmployee]);

    // Clear temporary employees
    const clearTempEmployees = () => {
      console.log("Clearing temporary employees");
      setTempEmployees([]);
      try {
        localStorage.removeItem("tempCustomerEmployees");
      } catch (error) {
        console.error("Error clearing temporary employees:", error);
      }
    };

    // Reset selection state
    const resetSelection = () => {
      console.log("Resetting customer employee selection");
      clearTempEmployees();
    };

    // Expose refresh function and addTempEmployee via ref
    useImperativeHandle(ref, () => ({
      refreshCustomers: fetchCustomers,
      addTempEmployee,
      clearTempEmployees,
      resetSelection,
    }));

    const handleEmployeeSelect = (employeeId: string) => {
      // Combine regular and temporary employees
      const allEmployees = [...employees, ...tempEmployees];
      const employee = allEmployees.find((emp) => emp._id === employeeId);

      console.log("CustomerEmployeeSelector: Employee selected:", employeeId);
      console.log("CustomerEmployeeSelector: Found employee:", employee);

      if (employee) {
        // For temp employees, create a temporary customer object
        if (employee._id.startsWith("temp_")) {
          const tempCustomer: Customer = {
            _id: employee.customerId,
            CustomerCompanyName: employee.customerName,
            Employees: [employee],
            // Fill in defaults for required fields
            GstNumber: "",
            Status: "Active",
            RJBDSName: "",
            LedgerType: { _id: "", Name: "", __v: 0 },
            Dealer: { _id: "", Name: "", __v: 0 },
            Mode: { _id: "", Name: "", __v: 0 },
            CompanyName: {
              _id: "",
              companyName: employee.customerName,
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
          console.log("CustomerEmployeeSelector: Calling onEmployeeSelect for temp employee:", employee.CustomerEmpName, tempCustomer.CustomerCompanyName);
          onEmployeeSelect(employee, tempCustomer);
        } else {
          // For regular employees, find the actual customer
          const customer = customers.find((c) => c._id === employee.customerId);
          if (customer) {
            console.log("CustomerEmployeeSelector: Calling onEmployeeSelect for regular employee:", employee.CustomerEmpName, customer.CustomerCompanyName);
            onEmployeeSelect(employee, customer);
          } else {
            console.error("CustomerEmployeeSelector: Customer not found for employee:", employee);
          }
        }
      }
    };

    if (error) {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-destructive">
              Customer Employee
            </Label>
            {onAddNewEmployee && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddNewEmployee}
                disabled={disabled}
                className="flex items-center space-x-1"
              >
                <Plus className="h-3 w-3" />
                <span className="text-xs">Add New</span>
              </Button>
            )}
          </div>
          <div className="border border-destructive rounded-md p-3 text-sm text-destructive">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <p className="font-medium">Failed to load customer employees</p>
            </div>
            <p className="text-xs mt-1">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchCustomers}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="customerEmployee" className="text-sm">
            Select Customer Employee
            <span className="text-destructive ml-1">*</span>
            {tempEmployees.length > 0 && (
              <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                +{tempEmployees.length} new
              </span>
            )}
          </Label>
          {onAddNewEmployee && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddNewEmployee}
              disabled={disabled || loading}
              className="flex items-center space-x-1"
            >
              <Plus className="h-3 w-3" />
              <span className="text-xs">Add New</span>
            </Button>
          )}
        </div>

        <Select
          onValueChange={handleEmployeeSelect}
          value={selectedEmployeeId || ""}
          disabled={disabled || loading}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                loading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading employees...</span>
                  </div>
                ) : (
                  "Select a customer employee"
                )
              }
            />
          </SelectTrigger>
          <SelectContent>
            {(() => {
              const totalEmployees = employees.length + tempEmployees.length;
              console.log(
                "Rendering dropdown - Regular employees:",
                employees.length,
                "Temp employees:",
                tempEmployees.length,
              );

              if (totalEmployees === 0) {
                return (
                  <SelectItem value="no-employees" disabled>
                    No employees found
                  </SelectItem>
                );
              }

              return (
                <>
                  {/* Show temporary employees first with * indicator */}
                  {tempEmployees.map((employee) => (
                    <SelectItem key={employee._id} value={employee._id}>
                      {employee.CustomerEmpName} ({employee.customerName}) *
                    </SelectItem>
                  ))}
                  {/* Show regular employees */}
                  {employees.map((employee) => (
                    <SelectItem key={employee._id} value={employee._id}>
                      {employee.CustomerEmpName} ({employee.customerName})
                    </SelectItem>
                  ))}
                </>
              );
            })()}
          </SelectContent>
        </Select>
      </div>
    );
  },
);

CustomerEmployeeSelector.displayName = "CustomerEmployeeSelector";
