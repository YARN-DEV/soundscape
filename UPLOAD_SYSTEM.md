# Phase 2: Audio Upload System

## Overview
This phase adds a complete upload system with support for:
- **Artist uploads** - Individual track uploads via web form
- **Admin batch uploads** - Multiple tracks at once
- **Multiple storage backends** - Local, AWS S3, Cloudinary

---

## Components

### 1. API Routes

#### POST /api/upload/tracks
Artist single track upload
- **Auth**: Bearer token required
- **Payload**: FormData with file, title, description
- **Response**: Created track object
- **Status Codes**: 200 (success), 400 (validation), 401 (unauthorized), 500 (error)

```bash
curl -X POST http://localhost:3000/api/upload/tracks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@song.mp3" \
  -F "title=My Song" \
  -F "description=Song description"
```

#### POST /api/upload/batch
Admin batch upload (multiple files)
- **Auth**: Admin bearer token required
- **Payload**: FormData with files[], artistId, genre
- **Response**: Results object with successful/failed arrays
- **Status Codes**: 200 (complete), 400 (validation), 403 (not admin), 500 (error)

```bash
curl -X POST http://localhost:3000/api/upload/batch \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -F "files=@song1.mp3" \
  -F "files=@song2.mp3" \
  -F "artistId=artist-123" \
  -F "genre=Pop"
```

#### POST /api/upload/local
Local storage upload (development)
- **Payload**: FormData with file
- **Response**: { url, filename, size, type }
- **Files saved to**: `public/uploads/audio/`

#### POST /api/upload/s3/presigned-url
Get presigned URL for direct S3 upload
- **Payload**: { filename, contentType, size }
- **Response**: { presignedUrl, fileUrl, expiresIn }

---

## UI Components

### ArtistUploadForm
Path: `src/components/upload/ArtistUploadForm.tsx`

Features:
- Drag-and-drop file upload
- File validation (type, size)
- Title and description inputs
- Progress tracking
- Error handling
- Success feedback

Usage:
```tsx
import { ArtistUploadForm } from '@/components/upload/ArtistUploadForm'

export default function UploadPage() {
  return <ArtistUploadForm />
}
```

Access at: `/artists/me/upload`

### AdminBatchUpload
Path: `src/components/upload/AdminBatchUpload.tsx`

Features:
- Multi-file drag-and-drop
- File list management (add/remove)
- Artist selection dropdown
- Genre selection
- Batch results display
- Success/failure reporting

Usage:
```tsx
import { AdminBatchUpload } from '@/components/upload/AdminBatchUpload'

export default function AdminUploadPage() {
  return <AdminBatchUpload />
}
```

Access at: `/admin/upload`

---

## Configuration

### Storage Providers

#### Local Storage (Development)
```env
NEXT_PUBLIC_STORAGE_PROVIDER="local"
```
- Files saved to: `public/uploads/audio/`
- Best for: Development/testing
- No additional setup required

#### Cloudinary (Recommended for Production)
```env
NEXT_PUBLIC_STORAGE_PROVIDER="cloudinary"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="your-upload-preset"
```

**Setup Steps:**
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to Dashboard → Settings → Upload
3. Create an unsigned upload preset
4. Copy Cloud Name and Upload Preset
5. Add to `.env`

#### AWS S3 (Enterprise)
```env
NEXT_PUBLIC_STORAGE_PROVIDER="s3"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your-bucket-name"
```

**Setup Steps:**
1. Create S3 bucket in AWS Console
2. Create IAM user with S3 permissions
3. Generate access keys
4. Create upload presigned URLs endpoint (see code comments)
5. Add to `.env`

---

## File Validation

### Supported Audio Formats
- MP3 (audio/mpeg)
- MP4 (audio/mp4)
- WAV (audio/wav)
- WebM (audio/webm)
- OGG (audio/ogg)
- FLAC (audio/flac)

### File Size Limits
- **Maximum**: 100 MB per file
- **Validation**: Client-side before upload

### Validation Function
```typescript
import { validateAudioFile } from '@/lib/cloud-storage'

try {
  validateAudioFile(file)
  console.log('File is valid')
} catch (error) {
  console.error(error.message)
}
```

---

## Utilities

### Cloud Storage Library
Path: `src/lib/cloud-storage.ts`

Key Functions:
- `uploadAudio(file, onProgress?)` - Main upload function
- `uploadToCloudinary(file, onProgress?)` - Cloudinary upload
- `uploadToS3(file, onProgress?)` - S3 upload
- `uploadToLocal(file)` - Local upload
- `validateAudioFile(file)` - File validation
- `getAudioDuration(file)` - Get audio duration

### Cache Manager
Path: `src/lib/cache-manager.ts`

Functions:
- `cacheTrackAudio()` - Save audio to IndexedDB
- `getOfflineTrack()` - Retrieve cached audio
- `deleteOfflineTrack()` - Remove from cache
- `getCacheSize()` - Get total cache size
- `formatBytes()` - Format bytes to readable string

---

## Database Schema

### Track Model (Prisma)
```prisma
model Track {
  id        String  @id @default(cuid())
  title     String
  description String?
  audioUrl  String
  duration  Int
  artistId  String
  explicit  Boolean @default(false)
  genre     String  @default("Other")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  artist    Artist  @relation(fields: [artistId], references: [id])
}
```

New fields added for uploads:
- `duration` - Track length in seconds
- `genre` - Music genre
- `explicit` - Content rating

---

## Testing

### Test Local Upload
```bash
curl -X POST http://localhost:3000/api/upload/local \
  -F "file=@path/to/song.mp3"
```

### Test Artist Upload
1. Get auth token (login first)
2. Go to `/artists/me/upload`
3. Select audio file
4. Enter title and description
5. Click "Upload Track"

### Test Admin Batch Upload
1. Login as admin
2. Go to `/admin/upload`
3. Drag multiple audio files
4. Select artist and genre
5. Click "Upload" button
6. View results

---

## Error Handling

### Common Errors

**"Module not found: cloud-storage"**
- Ensure `src/lib/cloud-storage.ts` exists

**"Unauthorized" (401)**
- Missing or invalid Bearer token
- Check localStorage for auth token

**"Only artists can upload" (403)**
- Need artist profile or admin role
- TODO: Implement proper role checking

**"File size exceeds limit"**
- File is larger than 100MB
- Split into smaller chunks for production

**"Invalid file type"**
- Format not supported
- Check supported formats list above

---

## Future Enhancements

### Phase 2 Additions (To Implement)
- [ ] Chunk uploads for large files
- [ ] Upload progress WebSocket
- [ ] Audio processing (bitrate conversion)
- [ ] Metadata extraction (ID3 tags)
- [ ] Virus scanning
- [ ] Duplicate detection
- [ ] Queue management for offline uploads

### Phase 3 (Planned)
- [ ] Background sync
- [ ] Offline upload queue
- [ ] Auto-retry failed uploads
- [ ] Upload scheduling

---

## Configuration Checklist

For **Local Development**:
- ✅ Set `NEXT_PUBLIC_STORAGE_PROVIDER="local"`
- ✅ Create `public/uploads/audio/` directory
- ✅ Test uploads via `/artists/me/upload`

For **Cloudinary Production**:
- [ ] Create Cloudinary account
- [ ] Create unsigned upload preset
- [ ] Set env vars
- [ ] Test uploads
- [ ] Monitor Cloudinary usage

For **AWS S3 Production**:
- [ ] Create S3 bucket
- [ ] Create IAM user
- [ ] Generate access keys
- [ ] Configure CORS
- [ ] Implement presigned URL logic
- [ ] Set env vars
- [ ] Test uploads

---

## Support

Refer to:
- Cloud Storage Docs: `src/lib/cloud-storage.ts`
- Components: `src/components/upload/`
- API Routes: `src/app/api/upload/`
- Prisma Schema: `prisma/schema.prisma`
