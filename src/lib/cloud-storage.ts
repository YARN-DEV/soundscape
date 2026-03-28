/**
 * Cloud storage utilities for uploading audio files
 * Supports both AWS S3 and Cloudinary
 */

interface UploadConfig {
  provider: 'cloudinary' | 's3' | 'local';
  cloudinary?: {
    cloudName: string;
    uploadPreset: string;
  };
  s3?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

interface UploadResult {
  url: string;
  filename: string;
  size: number;
  duration?: number;
  provider: string;
}

const config: UploadConfig = {
  provider: (process.env.NEXT_PUBLIC_STORAGE_PROVIDER || 'local') as 'cloudinary' | 's3' | 'local',
  cloudinary: {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '',
    uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '',
  },
  s3: {
    bucket: process.env.AWS_S3_BUCKET || '',
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
};

/**
 * Upload audio file to Cloudinary
 */
export async function uploadToCloudinary(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', config.cloudinary!.uploadPreset);
  formData.append('resource_type', 'auto');

  try {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });
    }

    return new Promise((resolve, reject) => {
      xhr.addEventListener('load', () => {
        if (xhr.status !== 200) {
          reject(new Error(`Upload failed with status ${xhr.status}`));
          return;
        }

        try {
          const response = JSON.parse(xhr.responseText);
          resolve({
            url: response.secure_url,
            filename: response.original_filename,
            size: response.bytes,
            provider: 'cloudinary',
          });
        } catch {
          reject(new Error('Failed to parse upload response'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open(
        'POST',
        `https://api.cloudinary.com/v1_1/${config.cloudinary!.cloudName}/auto/upload`
      );
      xhr.send(formData);
    });
  } catch {
    throw new Error(`Cloudinary upload failed`);
  }
}

/**
 * Upload audio file to AWS S3
 */
export async function uploadToS3(file: File): Promise<UploadResult> {
  try {
    // Get presigned URL from backend
    const response = await fetch('/api/upload/s3/presigned-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        size: file.size,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get presigned URL');
    }

    const { presignedUrl, fileUrl } = await response.json();

    // Upload file to presigned URL
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file to S3');
    }

    return {
      url: fileUrl,
      filename: file.name,
      size: file.size,
      provider: 's3',
    };
  } catch {
    throw new Error(`S3 upload failed`);
  }
}

/**
 * Upload audio file to local storage (development only)
 */
export async function uploadToLocal(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/upload/local', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Local upload failed');
    }

    const data = await response.json();
    return {
      url: data.url,
      filename: data.filename,
      size: data.size,
      provider: 'local',
    };
  } catch (error) {
    throw new Error(`Local upload failed: ${error}`);
  }
}

/**
 * Main upload function - delegates to appropriate provider
 */
export async function uploadAudio(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  // Validate file
  validateAudioFile(file);

  switch (config.provider) {
    case 'cloudinary':
      return uploadToCloudinary(file, onProgress);
    case 's3':
      return uploadToS3(file);
    case 'local':
    default:
      return uploadToLocal(file);
  }
}

/**
 * Validate audio file
 */
export function validateAudioFile(file: File): void {
  const MAX_SIZE = 100 * 1024 * 1024; // 100MB
  const ALLOWED_TYPES = [
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/webm',
    'audio/ogg',
    'audio/flac',
  ];

  if (!file) {
    throw new Error('No file provided');
  }

  if (file.size > MAX_SIZE) {
    throw new Error(`File size exceeds 100MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      `Invalid file type. Allowed: MP3, MP4, WAV, WebM, OGG, FLAC. Got: ${file.type || 'unknown'}`
    );
  }
}

/**
 * Get audio duration
 */
export async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);

    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    });

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to read audio duration'));
    });

    audio.src = url;
  });
}

export { config };
