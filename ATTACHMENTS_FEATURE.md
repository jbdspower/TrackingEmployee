# Meeting Attachments Feature

## Overview
Added support for file attachments in meetings. Users can attach files when ending a meeting, and these attachments are displayed in the dashboard meeting table.

## Changes Made

### 1. Database Model (Meeting.ts)
- Added `attachments` field to store array of file URLs/paths
- Field type: `string[]` (array of URLs)
- Default: empty array `[]`

### 2. API Types (shared/api.ts)
- Added `attachments?: string[]` to `MeetingLog` interface
- Added `attachments?: string[]` to `MeetingDetails` interface

### 3. Backend Routes (analytics.ts)
- Updated `getEmployeeDetails` to include attachments in meeting records
- Updated `getAllEmployeesDetails` to include attachments in meeting records
- Attachments are retrieved from either `meeting.meetingDetails.attachments` or `meeting.attachments`

### 4. Frontend (Dashboard.tsx)
- Added `attachments?: string[]` to `EmployeeMeetingRecord` interface
- Added "Attachments" column in meeting table (after "Approved By")
- Displays clickable links to download/view attachments
- Shows file names with paperclip icon
- Shows "-" if no attachments

### 5. UI Components (EndMeetingModal.tsx)
- File attachment UI already exists
- Users can select multiple files
- Shows list of attached files with remove option
- Accepts: images, PDF, DOC, DOCX, XLS, XLSX

## File Upload Implementation

### Current Status
The UI for selecting files is complete, but **file upload to storage is not yet implemented**.

### Implementation Options

#### Option 1: Base64 Encoding (Simple, Not Recommended for Production)
Store files as base64 strings directly in MongoDB.

**Pros:**
- Simple to implement
- No external dependencies

**Cons:**
- Large database size
- Slow performance
- Not scalable

#### Option 2: Local File Storage (Development Only)
Store files in a local `uploads/` folder on the server.

**Implementation:**
1. Install multer: `npm install multer @types/multer`
2. Create upload endpoint in `server/routes/meetings.ts`:

```typescript
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: './uploads/meetings/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type'));
  }
});

// Upload endpoint
app.post('/api/meetings/:id/upload', upload.array('files', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];
    
    const fileUrls = files.map(file => `/uploads/meetings/${file.filename}`);
    
    // Update meeting with file URLs
    const meeting = await Meeting.findByIdAndUpdate(
      id,
      { $push: { attachments: { $each: fileUrls } } },
      { new: true }
    );
    
    res.json({ success: true, attachments: fileUrls });
  } catch (error) {
    res.status(500).json({ error: 'File upload failed' });
  }
});
```

3. Serve static files in `server/index.ts`:
```typescript
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
```

4. Update EndMeetingModal to upload files:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  setIsSubmitting(true);
  try {
    // Upload files first if any
    let uploadedFileUrls: string[] = [];
    if (attachedFiles.length > 0 && currentMeeting?.id) {
      const formData = new FormData();
      attachedFiles.forEach(file => {
        formData.append('files', file);
      });
      
      const uploadResponse = await fetch(`/api/meetings/${currentMeeting.id}/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        uploadedFileUrls = uploadData.attachments;
      }
    }
    
    // Include file URLs in meeting details
    const meetingDetailsWithFiles = {
      ...formData,
      attachments: uploadedFileUrls
    };
    
    await onEndMeeting(meetingDetailsWithFiles);
    handleClose();
  } catch (error) {
    console.error("Error ending meeting:", error);
  } finally {
    setIsSubmitting(false);
  }
};
```

#### Option 3: Cloud Storage (Recommended for Production)
Use AWS S3, Google Cloud Storage, or similar service.

**AWS S3 Implementation:**

1. Install AWS SDK: `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`

2. Create S3 upload utility:
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

export async function uploadToS3(file: Express.Multer.File): Promise<string> {
  const key = `meetings/${Date.now()}-${file.originalname}`;
  
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype
  }));
  
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
```

3. Update upload endpoint to use S3:
```typescript
app.post('/api/meetings/:id/upload', upload.array('files', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];
    
    // Upload to S3
    const uploadPromises = files.map(file => uploadToS3(file));
    const fileUrls = await Promise.all(uploadPromises);
    
    // Update meeting
    const meeting = await Meeting.findByIdAndUpdate(
      id,
      { $push: { attachments: { $each: fileUrls } } },
      { new: true }
    );
    
    res.json({ success: true, attachments: fileUrls });
  } catch (error) {
    res.status(500).json({ error: 'File upload failed' });
  }
});
```

## Current Display

The dashboard now shows attachments in the meeting table:

- **Column**: "Attachments" (after "Approved By")
- **Display**: Clickable links with paperclip icon
- **Behavior**: Opens file in new tab when clicked
- **Empty State**: Shows "-" if no attachments

## Testing

### Manual Testing Steps:

1. **Restart the server** (schema changes require restart)
2. Manually add attachments to a meeting in MongoDB:
```javascript
db.meetings.updateOne(
  { _id: ObjectId("YOUR_MEETING_ID") },
  { $set: { attachments: [
    "https://example.com/file1.pdf",
    "https://example.com/file2.jpg"
  ]}}
)
```

3. Open Dashboard and view the meeting
4. Verify attachments column shows clickable links
5. Click link to verify it opens in new tab

### With File Upload Implemented:

1. Start a meeting
2. End the meeting
3. Select files to attach
4. Submit the form
5. Verify files are uploaded
6. Check dashboard shows the attachments
7. Click attachment links to download/view

## Environment Variables (for Cloud Storage)

Add to `.env`:
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your-bucket-name
```

## Security Considerations

1. **File Size Limits**: Implement max file size (e.g., 10MB)
2. **File Type Validation**: Only allow specific file types
3. **Virus Scanning**: Scan uploaded files for malware
4. **Access Control**: Ensure only authorized users can access files
5. **Signed URLs**: Use temporary signed URLs for S3 (expires after X hours)
6. **Rate Limiting**: Prevent abuse of upload endpoint

## Notes

- Attachments are stored as URLs (strings)
- Multiple files can be attached to a single meeting
- Files are displayed in the order they were uploaded
- File names are extracted from the URL for display
- Long file names are truncated with ellipsis
- Hover over file name to see full name

## Next Steps

1. Choose a file storage solution (local/cloud)
2. Implement file upload endpoint
3. Update EndMeetingModal to upload files before submitting
4. Add file size and type validation
5. Implement file deletion (when meeting is deleted)
6. Add loading state during file upload
7. Show upload progress for large files
8. Add error handling for failed uploads
