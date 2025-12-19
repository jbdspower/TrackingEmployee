# Lead Creation Feature - End Meeting Modal

## Overview
Added functionality to create leads directly from the End Meeting modal using customer information.

## Implementation Details

### API Endpoint
- **URL**: `https://jbdspower.in/LeafNetServer/api/createLead?auth={token}`
- **Method**: POST
- **Authentication**: Token from localStorage (`idToken`)

### Payload Structure
```json
{
  "CompanyName": "string",
  "Name": "string",
  "Email": "string",
  "Mobile": "string",
  "Designation": "string",
  "Department": "string",
  "CreatedBy": "string (userId)",
  "Id": "string (JBDSL-XXXX)"
}
```

### Features Added

1. **Create Lead Button**
   - Located on the left side of the action buttons in the End Meeting modal
   - Only enabled when at least one customer is selected
   - Shows loading state while creating lead

2. **Token Management**
   - Fetches `idToken` from localStorage for authentication
   - Validates token presence before making API call

3. **User ID**
   - Fetches `userId` from localStorage
   - Falls back to default ID if not found

4. **Lead Data Mapping**
   - Uses first selected customer's information
   - Maps customer fields to lead payload:
     - `customerName` → `CompanyName`
     - `customerEmployeeName` → `Name`
     - `customerEmail` → `Email`
     - `customerMobile` → `Mobile`
     - `customerDesignation` → `Designation`
     - `customerDepartment` → `Department`

5. **Error Handling**
   - Validates customer selection
   - Validates authentication token
   - Shows toast notifications for success/failure
   - Logs detailed error information to console

6. **UI Updates**
   - Added `UserPlus` icon to Create Lead button
   - Button disabled during lead creation
   - Loading spinner shown during API call
   - Form disabled while creating lead

## Usage

1. Open End Meeting modal
2. Select at least one customer contact
3. Click "Create Lead" button
4. Lead will be created with the first selected customer's information
5. Success/error notification will be displayed

## Testing

To test the feature:
1. Ensure `idToken` is stored in localStorage
2. Start and end a meeting
3. Select a customer in the End Meeting modal
4. Click "Create Lead" button
5. Verify lead creation in the external system
