# Add Customer Employee Modal - Usage Guide

## Overview
The `AddCustomerEmployeeModal` component has been updated to integrate with your CRM API and make all fields mandatory.

## Changes Made

### 1. All Fields Now Mandatory
- **Email**: Changed from optional to required with validation
- **Mobile**: Changed from optional to required with validation (10-16 digits)
- All other fields remain required: Customer Name, Employee Name, Designation, Department

### 2. CRM API Integration
When the form is submitted, it automatically:
1. Validates all fields
2. Calls the CRM API: `POST https://jbdspower.in/LeafNetServer/api/addcustomerEmployee/68340889566d91e049668f07`
3. Sends the payload in the required format:
   ```json
   {
     "CustomerEmpName": "testing11",
     "Department": "department11",
     "Designation": "designation11",
     "Email": "abc@gmail.com",
     "Mobile": "1234567891"
   }
   ```
4. Then calls the parent's `onAddEmployee` callback (for local database if needed)

### 3. Configuration
The CRM API settings are configured at the top of the component:
```typescript
const CRM_API_BASE_URL = "https://jbdspower.in/LeafNetServer/api";
const CUSTOMER_COMPANY_ID = "68340889566d91e049668f07";
```

## How to Use

### Example Implementation

```tsx
import { AddCustomerEmployeeModal } from "@/components/AddCustomerEmployeeModal";
import { useState } from "react";

function YourComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddEmployee = async (employeeData) => {
    // Optional: Save to your local database here
    console.log("Employee data:", employeeData);
    
    // The CRM API call is already handled inside the modal
    // This callback is for any additional local processing
    
    return { employee: employeeData, customer: null };
  };

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        Add New Employee
      </button>

      <AddCustomerEmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddEmployee={handleAddEmployee}
        isLoading={isLoading}
        defaultCustomerName="Optional Company Name"
      />
    </>
  );
}
```

## Field Validation

### Email
- Required field
- Must be valid email format (e.g., user@example.com)

### Mobile
- Required field
- Must be 10-16 digits
- Can include country code with + prefix
- Spaces, dashes, and parentheses are allowed and will be stripped during validation

### Other Fields
- Customer Name: Required
- Employee Name: Required
- Designation: Required
- Department: Required

## Error Handling

The modal handles errors gracefully:
- Shows validation errors inline below each field
- Displays error toast if CRM API call fails
- Prevents form submission until all fields are valid
- Disables form during submission to prevent duplicate requests

## API Response

The CRM API should return a success response. If it fails:
- Error is logged to console
- Error is thrown to parent component
- User sees appropriate error message
- Form remains open for correction

## Testing

To test the integration:

1. Open the modal
2. Fill in all required fields:
   - Customer Name: "Test Company"
   - Employee Name: "John Doe"
   - Email: "john@testcompany.com"
   - Mobile: "1234567890"
   - Designation: "Manager"
   - Department: "Sales"
3. Click "Add Employee"
4. Check browser console for API call logs
5. Verify data is saved in CRM database

## Notes

- The customer company ID `68340889566d91e049668f07` is hardcoded
- If you need dynamic company IDs, pass it as a prop to the modal
- The modal auto-fills customer name if `defaultCustomerName` prop is provided
- All API calls are logged to console for debugging
