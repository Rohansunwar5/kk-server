import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { InternalServerError } from '../errors/internal-server.error';
import config from '../config';

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
  secure: true
});

export const uploadImageToCloudinary = (file: Express.Multer.File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'velvet-box/images',
        resource_type: 'image', // 🔥 STRICT IMAGE TYPE
      },
      (error, result) => {
        if (error) return reject(new InternalServerError('Failed to upload image to Cloudinary'));
        if (result) resolve(result.secure_url);
      }
    );

    const s = new Readable();
    s.push(file.buffer);
    s.push(null);
    s.pipe(uploadStream);
  });
};

export const uploadDocumentToCloudinary = (file: Express.Multer.File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'velvet-box/documents',
        resource_type: 'raw', // 🔥 CRITICAL FOR PDF, DOCX, XLSX, PPTX
      },
      (error, result) => {
        if (error) return reject(new InternalServerError('Failed to upload document to Cloudinary'));
        if (result) resolve(result.secure_url);
      }
    );

    const s = new Readable();
    s.push(file.buffer);
    s.push(null);
    s.pipe(uploadStream);
  });
};

// 🎙️ NEW: Upload audio/voice recording to Cloudinary
export const uploadAudioToCloudinary = (
  file: Express.Multer.File,
  options?: {
    folder?: string;
    maxDuration?: number; // in seconds
  }
): Promise<{ url: string; duration: number; format: string }> => {
  return new Promise((resolve, reject) => {
    const uploadOptions: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
      folder: options?.folder || 'velvet-box/voice-recordings',
      resource_type: 'video', // 🔥 Cloudinary uses 'video' for audio files
      chunk_size: 6000000, // 6MB chunks for better upload reliability
    };

    // Add duration limit if specified
    if (options?.maxDuration) {
      uploadOptions.duration = options.maxDuration;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          return reject(new InternalServerError('Failed to upload audio to Cloudinary'));
        }
        if (result) {
          resolve({
            url: result.secure_url,
            duration: result.duration || 0,
            format: result.format || 'unknown',
          });
        }
      }
    );

    const s = new Readable();
    s.push(file.buffer);
    s.push(null);
    s.pipe(uploadStream);
  });
};

// 🎥 NEW: Upload video recording to Cloudinary
export const uploadVideoToCloudinary = (
  file: Express.Multer.File,
  options?: {
    folder?: string;
    maxDuration?: number; // in seconds
    quality?: 'auto' | 'auto:low' | 'auto:good' | 'auto:best';
  }
): Promise<{ url: string; duration: number; format: string }> => {
  return new Promise((resolve, reject) => {
    const uploadOptions: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
      folder: options?.folder || 'velvet-box/video-recordings',
      resource_type: 'video',
      quality: options?.quality || 'auto',
      chunk_size: 6000000, // 6MB chunks for large files
    };

    // Add duration limit if specified
    if (options?.maxDuration) {
      uploadOptions.duration = options.maxDuration;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          return reject(new InternalServerError('Failed to upload video to Cloudinary'));
        }
        if (result) {
          resolve({
            url: result.secure_url,
            duration: result.duration || 0,
            format: result.format || 'unknown',
          });
        }
      }
    );

    const s = new Readable();
    s.push(file.buffer);
    s.push(null);
    s.pipe(uploadStream);
  });
};

export const uploadToCloudinary = (file: Express.Multer.File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'velvet-box',
        resource_type: 'auto'
      },
      (error, result) => {
        if (error) {
          reject(new InternalServerError('Failed to upload file to Cloudinary'));
        }
        if (result) {
          resolve(result.secure_url);
        }
      }
    );

    const readableStream = new Readable();
    readableStream.push(file.buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

// 🗑️ ENHANCED: Delete media from Cloudinary (supports all resource types)
export const deleteFromCloudinary = async (
  url: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<void> => {
  try {
    // Extract public_id from URL
    const urlParts = url.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');

    if (uploadIndex === -1) {
      throw new Error('Invalid Cloudinary URL');
    }

    // Get the path after 'upload' and version (if exists)
    const pathAfterUpload = urlParts.slice(uploadIndex + 1);

    // Remove version if present (starts with 'v' followed by numbers)
    const startIndex = pathAfterUpload[0].startsWith('v') && !isNaN(Number(pathAfterUpload[0].slice(1))) ? 1 : 0;

    // Get file path and remove extension
    const filePath = pathAfterUpload.slice(startIndex).join('/');
    const publicId = filePath.substring(0, filePath.lastIndexOf('.')) || filePath;

    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true // Invalidate CDN cache
    });
  } catch (error) {
    // console.error('Error deleting from Cloudinary:', error);
    throw new InternalServerError('Failed to delete file from Cloudinary');
  }
};

// 🆕 Helper: Get public_id from Cloudinary URL
export const getPublicIdFromUrl = (url: string): string => {
  try {
    const urlParts = url.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');

    if (uploadIndex === -1) {
      throw new Error('Invalid Cloudinary URL');
    }

    const pathAfterUpload = urlParts.slice(uploadIndex + 1);
    const startIndex = pathAfterUpload[0].startsWith('v') && !isNaN(Number(pathAfterUpload[0].slice(1))) ? 1 : 0;

    const filePath = pathAfterUpload.slice(startIndex).join('/');
    const publicId = filePath.substring(0, filePath.lastIndexOf('.')) || filePath;

    return publicId;
  } catch (error) {
    throw new Error('Failed to extract public_id from URL');
  }
};

// 🆕 Helper: Delete multiple files from Cloudinary
export const deleteManyFromCloudinary = async (
  urls: string[],
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<void> => {
  try {
    const deletePromises = urls.map(url => deleteFromCloudinary(url, resourceType));
    await Promise.all(deletePromises);
  } catch (error) {
    // console.error('Error deleting multiple files from Cloudinary:', error);
    throw new InternalServerError('Failed to delete files from Cloudinary');
  }
};
