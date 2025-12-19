# File Size Validation - Implementation

## Overview
Added automatic file size validation to prevent users from attaching files that are too large. This ensures better performance and prevents MongoDB document size limit issues.

## Validation Rules

### Individual File Limit
- **Maximum**: 5MB per file
- **Enforced**: At file selection time
- **User Feedback**: Toast notification with file name and size

### Total Size Limit
- **Maximum**: 10MB total for all files in a meeting
- **Enforced**: When adding new files
- **User Feedback**: Toast notification showing current and new sizes

### MongoDB Limit
- **Hard Limit**: 16MB per document
- **Safety Margin**: 10MB limit provides buffer for base64 encoding (~33% increase)

## Implementation Details

### File Selection Validation

```typescript
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB
  
  // Step 1: Filter files by individual size
  const oversizedFiles = newFiles.filter(f => f.size > MAX_FILE_SIZE);
  const validFiles = newFiles.filter(f => f.size <= MAX_FILE_SIZE);
  
  // Step 2: Show error for oversized files
  if (oversizedFiles.length > 0) {
    const fileNames = oversizedFiles
      .map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB)`)
      .join(', ');
    
    toast({
      title: "File Size Limit Exceeded",
      description: `The following file(s) exceed 5MB limit: ${fileNames}`,
      variant: "destructive",
    });
  }
  
  // Step 3: Check total size
  if (validFiles.length > 0) {
    const currentTotalSize = attachedFiles.reduce((sum, f) => sum + f.size, 0);
    const newTotalSize = validFiles.reduce((sum, f) => sum + f.size, 0);
    const totalSize = currentTotalSize + newTotalSize;
    
    if (totalSize > MAX_TOTAL_SIZE) {
      toast({
        title: "Total Size Limit Exceeded",
        description: `Total file size cannot exceed 10MB. Current: ${(currentTotalSize / 1024 / 1024).toFixed(2)} MB, Adding: ${(newTotalSize / 1024 / 1024).toFixed(2)} MB`,
        variant: "destructive",
      });
    } else {
      // Only add valid files that don't exceed total limit
      setAttachedFiles(prev => [...prev, ...validFiles]);
      toast({
        title: "Files Attached",
        description: `${validFiles.length} file(s) attached successfully`,
      });
    }
  }
};
```

## UI Indicators

### 1. Label with Size Limit
```tsx
<Label className="text-sm flex items-center justify-between">
  <div className="flex items-center space-x-2">
    <Paperclip className="h-4 w-4" />
    <span>Attach Files (Optional)</span>
  </div>
  <span className="text-xs text-muted-foreground font-normal">
    Max 5MB per file
  </span>
</Label>
```

### 2. Help Text
```tsx
<div className="text-xs text-muted-foreground">
  Supported: Images, PDF, DOC, DOCX, XLS, XLSX • Max 5MB per file • Max 10MB total
</div>
```

### 3. Total Size Display
```tsx
<div className="text-xs text-muted-foreground flex items-center justify-between">
  <span>{attachedFiles.length} file(s) attached</span>
  <span>
    Total: {(attachedFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB
  </span>
</div>
```

### 4. Individual File Size
```tsx
<span className="text-xs text-muted-foreground">
  ({(file.size / 1024).toFixed(1)} KB)
</span>
```

## User Experience

### Scenario 1: Single Large File
**User Action:** Selects a 7MB PDF file

**System Response:**
- ❌ File is rejected
- 🔔 Toast notification: "File Size Limit Exceeded: document.pdf (7.00 MB)"
- 📋 File is NOT added to the list
- ✅ User can select a smaller file

### Scenario 2: Multiple Files Exceeding Total
**User Action:** 
- Already has 6MB of files attached
- Tries to add 5MB more

**System Response:**
- ❌ New files are rejected
- 🔔 Toast notification: "Total Size Limit Exceeded: Current: 6.00 MB, Adding: 5.00 MB"
- 📋 Existing files remain attached
- ✅ User can remove some files and try again

### Scenario 3: Mixed Valid and Invalid Files
**User Action:** Selects 3 files:
- file1.jpg (2MB) ✅
- file2.pdf (8MB) ❌
- file3.docx (1MB) ✅

**System Response:**
- ✅ Valid files (file1.jpg, file3.docx) are added
- ❌ Invalid file (file2.pdf) is rejected
- 🔔 Toast notification: "File Size Limit Exceeded: file2.pdf (8.00 MB)"
- 🔔 Toast notification: "Files Attached: 2 file(s) attached successfully"
- 📋 List shows 2 files with total size

### Scenario 4: All Files Valid
**User Action:** Selects 2 files:
- image.png (1.5MB) ✅
- report.pdf (2.3MB) ✅

**System Response:**
- ✅ All files are added
- 🔔 Toast notification: "Files Attached: 2 file(s) attached successfully"
- 📋 List shows: "2 file(s) attached • Total: 3.80 MB"

## Error Messages

### Individual File Too Large
```
Title: File Size Limit Exceeded
Description: The following file(s) exceed 5MB limit: filename.pdf (7.23 MB)
Type: Destructive (red)
```

### Total Size Too Large
```
Title: Total Size Limit Exceeded
Description: Total file size cannot exceed 10MB. Current: 6.50 MB, Adding: 4.20 MB
Type: Destructive (red)
```

### Success
```
Title: Files Attached
Description: 2 file(s) attached successfully
Type: Default (neutral)
```

## Size Calculations

### Display Formats

**Kilobytes (KB):**
- Used for individual files in the list
- Formula: `(file.size / 1024).toFixed(1)`
- Example: "245.6 KB"

**Megabytes (MB):**
- Used for total size and error messages
- Formula: `(file.size / 1024 / 1024).toFixed(2)`
- Example: "3.45 MB"

### Base64 Encoding Impact

Original file sizes are validated BEFORE base64 encoding:
- 5MB file → ~6.65MB after base64 encoding
- 10MB total → ~13.3MB after encoding
- Still within 16MB MongoDB limit

## Testing

### Test Case 1: Single File Validation
```
1. Select a 3MB file → ✅ Should be accepted
2. Select a 6MB file → ❌ Should be rejected with error
3. Verify error message shows file name and size
```

### Test Case 2: Total Size Validation
```
1. Attach 4MB file → ✅ Accepted
2. Attach 4MB file → ✅ Accepted (total 8MB)
3. Attach 3MB file → ❌ Rejected (would exceed 10MB)
4. Verify error shows current and new sizes
```

### Test Case 3: Multiple Files at Once
```
1. Select 3 files: 2MB, 7MB, 1MB
2. Verify 2MB and 1MB are accepted
3. Verify 7MB is rejected
4. Verify both success and error toasts appear
```

### Test Case 4: UI Display
```
1. Attach 2 files
2. Verify total size is displayed correctly
3. Verify individual file sizes are shown
4. Verify size limit is shown in label
```

## Browser Compatibility

### File Size API
- ✅ `file.size` property supported in all modern browsers
- ✅ Returns size in bytes
- ✅ Accurate for all file types

### Validation Timing
- ✅ Validation happens immediately on file selection
- ✅ No files are uploaded before validation
- ✅ No network requests for rejected files

## Performance

### Validation Speed
- **Instant**: File size check is synchronous
- **No Delay**: Validation happens before any processing
- **Efficient**: Only valid files are processed

### Memory Usage
- **Before Validation**: Only file metadata loaded
- **After Validation**: Only valid files kept in memory
- **Rejected Files**: Immediately discarded

## Future Enhancements

### 1. File Compression
```typescript
// Compress images before upload
async function compressImage(file: File): Promise<File> {
  // Use canvas API to resize/compress
  // Return compressed file
}
```

### 2. Progressive Upload
```typescript
// Show progress for large files
const [uploadProgress, setUploadProgress] = useState(0);

// Update progress during base64 conversion
for (let i = 0; i < files.length; i++) {
  const base64 = await convertToBase64(files[i]);
  setUploadProgress(((i + 1) / files.length) * 100);
}
```

### 3. File Type Validation
```typescript
// Validate MIME types
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

if (!ALLOWED_TYPES.includes(file.type)) {
  toast({ title: "Invalid File Type", ... });
}
```

### 4. Drag and Drop
```typescript
// Add drag and drop support
const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files);
  handleFileSelect({ target: { files } });
};
```

## Summary

✅ **Implemented Features:**
- Individual file size validation (5MB max)
- Total size validation (10MB max)
- Clear error messages with file names and sizes
- UI indicators showing limits and current sizes
- Automatic filtering of valid/invalid files
- Success and error toast notifications

✅ **User Benefits:**
- Immediate feedback on file size issues
- Clear understanding of limits
- No wasted time uploading invalid files
- Helpful error messages
- Visual size indicators

✅ **Technical Benefits:**
- Prevents MongoDB document size issues
- Reduces server load
- Improves performance
- Better error handling
- Consistent user experience
