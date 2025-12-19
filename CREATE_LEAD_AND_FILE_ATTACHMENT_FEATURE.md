# Create Lead and File Attachment Feature

## Overview
Added three new features to enhance the meeting workflow:
1. **Create Lead checkbox** in the Add Customer Employee modal
2. **File attachment** functionality in the End Meeting modal
3. **Add New Company with Create Lead** functionality in the Start Meeting modal

## Changes Made

### 1. Add Customer Employee Modal - Create Lead Feature

**File**: `TrackingEmployee/client/components/AddCustomerEmployeeModal.tsx`

#### New Features:
- Added a "Create Lead" checkbox at the bottom of the form
- When checked, automatically creates a lead after successfully adding the customer employee
- Uses the Lead API: `https://jbdspower.in/LeafNetServer/api/createLead?auth={token}`

#### Implementation Details:
- **Token**: Retrieved from `localStorage.getItem("idToken")`
- **User ID**: Retrieved from `localStorage.getItem("user")` (parsed JSON)
- **Payload**: Only includes available form data (not all fields are required)
  ```javascript
  {
    CompanyName: formData.customerName,
    Name: formData.customerEmployeeName,
    CreatedBy: userId,
    Id: "JBDSL-{timestamp}",
    // Optional fields (only if provided):
    Email: formData.email,
    Mobile: formData.mobile,
    Designation: formData.designation,
    Department: formData.department
  }
  ```

#### User Experience:
- Checkbox appears above the action buttons
- When checked and form is submitted:
  1. Employee is saved to CRM
  2. Lead is automatically created
  3. Success toast notification shows lead creation status
- If lead creation fails, employee is still saved (non-blocking)

### 2. End Meeting Modal - File Attachment Feature

**File**: `TrackingEmployee/client/components/EndMeetingModal.tsx`

#### New Features:
- Added file attachment section in the End Meeting modal
- Users can attach multiple files (images, PDFs, documents, spreadsheets)
- Files are displayed in a list with size information
- Individual files can be removed before submission

#### Implementation Details:
- **Accepted File Types**: `image/*,.pdf,.doc,.docx,.xls,.xlsx`
- **File Storage**: Files are stored in component state as `File[]` objects
- **UI Components**:
  - Hidden file input with ref
  - "Choose Files" button to trigger file selection
  - File list showing name and size
  - Remove button (X) for each file

#### User Experience:
- File attachment section appears below the Discussion field
- Click "Choose Files" to open file picker
- Multiple files can be selected at once
- Attached files show:
  - File name (truncated if too long)
  - File size in KB
  - Remove button
- Files are cleared when modal is closed
- Toast notification confirms successful file attachment

## API Integration

### Create Lead API
- **Endpoint**: `https://jbdspower.in/LeafNetServer/api/createLead?auth={token}`
- **Method**: POST
- **Headers**: `Content-Type: application/json`
- **Authentication**: Token passed as query parameter
- **Payload Structure**:
  ```json
  {
    "CompanyName": "string (required)",
    "Name": "string (required)",
    "CreatedBy": "string (required)",
    "Id": "string (required)",
    "Email": "string (optional)",
    "Mobile": "string (optional)",
    "Designation": "string (optional)",
    "Department": "string (optional)"
  }
  ```

### 3. Start Meeting Modal - Add New Company with Create Lead

**File**: `TrackingEmployee/client/components/StartMeetingModal.tsx`

#### New Features:
- Added "Add New Company" button next to the Client/Company label
- When clicked, shows a form to add a new company
- Includes a "Create Lead" checkbox
- When checked, automatically creates a lead for the new company when starting the meeting
- Uses the same Lead API: `https://jbdspower.in/LeafNetServer/api/createLead?auth={token}`

#### Implementation Details:
- **Token**: Retrieved from `localStorage.getItem("idToken")`
- **User ID**: Retrieved from `localStorage.getItem("user")` (parsed JSON)
- **Payload**: Minimal data for new company lead
  ```javascript
  {
    CompanyName: newCompanyName.trim(),
    Name: "New Lead", // Default name
    CreatedBy: userId,
    Id: "JBDSL-{timestamp}"
  }
  ```

#### User Experience:
- "Add New Company" button appears next to the Client/Company label
- When clicked:
  1. Shows a form with company name input field
  2. Shows "Create Lead" checkbox
  3. Button text changes to "Cancel" to hide the form
- When company name is entered:
  1. Automatically sets it as the custom client name
  2. If "Create Lead" is checked, shows a preview message
- When form is submitted:
  1. If checkbox is checked, creates lead first
  2. Then starts the meeting with the new company
  3. Shows success/error toast notifications
- Lead creation is non-blocking (meeting starts even if lead creation fails)

## Testing Checklist

### Add Customer Employee Modal
- [ ] Checkbox appears above action buttons
- [ ] Checkbox can be toggled on/off
- [ ] Form submits successfully without checkbox checked
- [ ] Form submits successfully with checkbox checked
- [ ] Lead is created when checkbox is checked
- [ ] Toast notification shows lead creation success
- [ ] Toast notification shows lead creation failure (if API fails)
- [ ] Employee is still saved even if lead creation fails
- [ ] Checkbox state resets when modal is closed

### End Meeting Modal
- [ ] File attachment section appears below Discussion field
- [ ] "Choose Files" button opens file picker
- [ ] Multiple files can be selected
- [ ] Attached files appear in the list
- [ ] File name and size are displayed correctly
- [ ] Remove button (X) removes individual files
- [ ] Files are cleared when modal is closed
- [ ] Toast notification shows when files are attached
- [ ] Form can be submitted with or without files
- [ ] Only accepted file types can be selected

### Start Meeting Modal
- [ ] "Add New Company" button appears next to Client/Company label
- [ ] Clicking button shows the Add New Company form
- [ ] Button text changes to "Cancel" when form is shown
- [ ] Company name input field appears
- [ ] "Create Lead" checkbox appears
- [ ] Entering company name auto-fills custom client field
- [ ] Checkbox can be toggled on/off
- [ ] Preview message shows when checkbox is checked
- [ ] Lead is created when checkbox is checked and form is submitted
- [ ] Toast notification shows lead creation success
- [ ] Toast notification shows lead creation failure (if API fails)
- [ ] Meeting starts even if lead creation fails
- [ ] Form resets when modal is closed
- [ ] Cancel button hides the Add New Company form

## Notes

### Non-Breaking Changes
- All changes are backward compatible
- Existing functionality remains unchanged
- Create Lead is optional (checkbox must be checked)
- File attachment is optional

### Error Handling
- Lead creation errors are caught and displayed via toast
- File selection errors are handled gracefully
- Authentication errors show appropriate messages
- Network errors are logged to console

### Future Enhancements
Potential improvements for future iterations:
1. Upload attached files to server/cloud storage
2. Add file size limit validation
3. Add file type validation with custom messages
4. Show upload progress for large files
5. Preview images before submission
6. Add drag-and-drop file upload
7. Store lead ID reference in meeting record
8. Add lead creation confirmation dialog

## Code Quality
- TypeScript types maintained
- No linting errors
- Consistent code style
- Proper error handling
- Console logging for debugging
- User-friendly toast notifications
