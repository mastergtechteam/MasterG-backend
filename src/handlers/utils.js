import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';


const s3 = new AWS.S3({
  region: process.env.REGION || 'ap-south-1',
  signatureVersion: 'v4'
});

const S3_BUCKET = process.env.S3_BUCKET;

/**
 * Success response helper
 */
const successResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
  body: JSON.stringify(body),
});

/**
 * Error response helper
 */
const errorResponse = (statusCode, message, details = null) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
  body: JSON.stringify({
    success: false,
    message,
    ...(details && { details }),
  }),
});

/**
 * Validate file type and size
 */
const validateFile = (fileType, fileSize, maxSize = 50 * 1024 * 1024) => {
  // Validate file size (default 50MB)
  if (fileSize > maxSize) {
    return { valid: false, error: `File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB` };
  }

  // Define allowed MIME types
  const allowedMimeTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
  };

  const allAllowedTypes = [...allowedMimeTypes.image, ...allowedMimeTypes.video, ...allowedMimeTypes.document];

  if (!allAllowedTypes.includes(fileType)) {
    return { valid: false, error: 'File type not allowed. Allowed types: images, videos, PDFs, documents' };
  }

  return { valid: true };
};

/**
 * Get file category based on MIME type
 */
const getFileCategory = (fileType) => {
  const categories = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
  };

  for (const [category, types] of Object.entries(categories)) {
    if (types.includes(fileType)) {
      return category;
    }
  }

  return 'file';
};

/**
 * Get file extension from MIME type
 */
const getFileExtension = (fileType) => {
  const extensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'video/mp4': 'mp4',
    'video/mpeg': 'mpeg',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/webm': 'webm',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt'
  };

  return extensions[fileType] || 'bin';
};

/**
 * Upload file to S3
 * POST /utils/upload
 * Body: { fileContent (base64), fileName, fileType, userId }
 */
export const uploadFile = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { fileContent, fileName, fileType, userId } = body;

    // Validate required fields
    if (!fileContent || !fileName || !fileType || !userId) {
      return errorResponse(400, 'Missing required fields: fileContent, fileName, fileType, userId');
    }

    if (!S3_BUCKET) {
      console.error('S3_BUCKET environment variable not set');
      return errorResponse(500, 'Server configuration error');
    }

    // Decode base64 content
    let buffer;
    try {
      buffer = Buffer.from(fileContent, 'base64');
    } catch (err) {
      return errorResponse(400, 'Invalid base64 encoded file content');
    }

    // Validate file
    const validation = validateFile(fileType, buffer.length);
    if (!validation.valid) {
      return errorResponse(400, validation.error);
    }

    const fileCategory = getFileCategory(fileType);
    const fileExtension = getFileExtension(fileType);
    const fileId = uuidv4();
    const timestamp = new Date().getTime();

    // Generate S3 key: userId/category/timestamp-fileName.extension
    const s3Key = `${userId}/${fileCategory}/${timestamp}-${fileId}.${fileExtension}`;

    // Upload to S3
    const params = {
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: fileType,
      ServerSideEncryption: 'AES256',
      Metadata: {
        'original-filename': fileName,
        'uploaded-by': userId,
        'upload-timestamp': new Date().toISOString()
      }
    };

    await s3.putObject(params).promise();

    // Generate public URL
    const publicUrl = `https://${S3_BUCKET}.s3.${process.env.REGION || 'ap-south-1'}.amazonaws.com/${s3Key}`;

    return successResponse(201, {
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileId,
        fileName,
        fileType,
        fileSize: buffer.length,
        category: fileCategory,
        s3Key,
        publicUrl,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('UploadFile error:', error);
    return errorResponse(500, 'Failed to upload file', error.message);
  }
};

/**
 * Generate presigned URL for downloading file from S3
 * POST /utils/presigned-url
 * Body: { s3Key, expirationMinutes (optional, default 60) }
 * Returns: Presigned URL valid for specified duration
 */
export const getPresignedUrl = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { s3Key, expirationMinutes = 60 } = body;

    if (!s3Key) {
      return errorResponse(400, 'Missing required field: s3Key');
    }

    if (!S3_BUCKET) {
      console.error('S3_BUCKET environment variable not set');
      return errorResponse(500, 'Server configuration error');
    }

    // Validate expiration time (max 24 hours / 1440 minutes)
    const expirationTime = Math.min(parseInt(expirationMinutes), 1440);

    const params = {
      Bucket: S3_BUCKET,
      Key: s3Key,
      Expires: expirationTime * 60 // Convert minutes to seconds
    };

    const presignedUrl = s3.getSignedUrl('getObject', params);

    return successResponse(200, {
      success: true,
      message: 'Presigned URL generated successfully',
      data: {
        s3Key,
        presignedUrl,
        expirationMinutes: expirationTime,
        expiresAt: new Date(Date.now() + expirationTime * 60 * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('GetPresignedUrl error:', error);
    return errorResponse(500, 'Failed to generate presigned URL', error.message);
  }
};

/**
 * Delete file from S3
 * DELETE /utils/files/{s3Key}
 * Query: { s3Key } (URL encoded)
 */
export const deleteFile = async (event) => {
  try {
    const { s3Key } = event.queryStringParameters || {};

    if (!s3Key) {
      return errorResponse(400, 'Missing required parameter: s3Key');
    }

    if (!S3_BUCKET) {
      console.error('S3_BUCKET environment variable not set');
      return errorResponse(500, 'Server configuration error');
    }

    // Decode the s3Key if it's URL encoded
    const decodedKey = decodeURIComponent(s3Key);

    const params = {
      Bucket: S3_BUCKET,
      Key: decodedKey
    };

    await s3.deleteObject(params).promise();

    return successResponse(200, {
      success: true,
      message: 'File deleted successfully',
      data: {
        s3Key: decodedKey,
        deletedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('DeleteFile error:', error);
    return errorResponse(500, 'Failed to delete file', error.message);
  }
};

/**
 * Get file metadata from S3
 * GET /utils/files/{s3Key}
 * Query: { s3Key } (URL encoded)
 */
export const getFileMetadata = async (event) => {
  try {
    const { s3Key } = event.queryStringParameters || {};

    if (!s3Key) {
      return errorResponse(400, 'Missing required parameter: s3Key');
    }

    if (!S3_BUCKET) {
      console.error('S3_BUCKET environment variable not set');
      return errorResponse(500, 'Server configuration error');
    }

    // Decode the s3Key if it's URL encoded
    const decodedKey = decodeURIComponent(s3Key);

    const params = {
      Bucket: S3_BUCKET,
      Key: decodedKey
    };

    const metadata = await s3.headObject(params).promise();

    return successResponse(200, {
      success: true,
      message: 'File metadata retrieved successfully',
      data: {
        s3Key: decodedKey,
        fileSize: metadata.ContentLength,
        contentType: metadata.ContentType,
        lastModified: metadata.LastModified,
        etag: metadata.ETag,
        metadata: metadata.Metadata || {}
      }
    });
  } catch (error) {
    console.error('GetFileMetadata error:', error);

    if (error.code === 'NoSuchKey') {
      return errorResponse(404, 'File not found in S3', { s3Key: decodeURIComponent(event.queryStringParameters?.s3Key) });
    }

    return errorResponse(500, 'Failed to retrieve file metadata', error.message);
  }
};

/**
 * Generate upload credentials for direct client-side upload
 * POST /utils/upload-credentials
 * Body: { fileName, fileType, userId }
 * Returns: Presigned POST credentials for direct S3 upload from client
 */
export const getUploadCredentials = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { fileName, fileType, userId } = body;

    if (!fileName || !fileType || !userId) {
      return errorResponse(400, 'Missing required fields: fileName, fileType, userId');
    }

    if (!S3_BUCKET) {
      console.error('S3_BUCKET environment variable not set');
      return errorResponse(500, 'Server configuration error');
    }

    // Validate file type
    const validation = validateFile(fileType, 0);
    if (!validation.valid) {
      return errorResponse(400, validation.error);
    }

    const fileCategory = getFileCategory(fileType);
    const fileExtension = getFileExtension(fileType);
    const fileId = uuidv4();
    const timestamp = new Date().getTime();

    // Generate S3 key
    const s3Key = `${userId}/${fileCategory}/${timestamp}-${fileId}.${fileExtension}`;

    // Set expiration time (15 minutes)
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 15);

    // Generate presigned POST policy
    const params = {
      Bucket: S3_BUCKET,
      Key: s3Key,
      Expires: 15 * 60, // 15 minutes
      ContentType: fileType
    };

    const presignedPost = s3.createPresignedPost(params);

    return successResponse(200, {
      success: true,
      message: 'Upload credentials generated successfully',
      data: {
        s3Key,
        fileName,
        uploadUrl: presignedPost.url,
        fields: presignedPost.fields,
        expiresAt: expiration.toISOString()
      }
    });
  } catch (error) {
    console.error('GetUploadCredentials error:', error);
    return errorResponse(500, 'Failed to generate upload credentials', error.message);
  }
};

/**
 * List files for a user
 * GET /utils/files?userId={userId}&category={category}&limit={limit}
 */
export const listUserFiles = async (event) => {
  try {
    const { userId, category, limit = 20 } = event.queryStringParameters || {};

    if (!userId) {
      return errorResponse(400, 'Missing required parameter: userId');
    }

    if (!S3_BUCKET) {
      console.error('S3_BUCKET environment variable not set');
      return errorResponse(500, 'Server configuration error');
    }

    // Build the prefix for listing objects
    const prefix = category ? `${userId}/${category}/` : `${userId}/`;

    const params = {
      Bucket: S3_BUCKET,
      Prefix: prefix,
      MaxKeys: Math.min(parseInt(limit), 1000)
    };

    const result = await s3.listObjectsV2(params).promise();

    // Transform the results
    const files = (result.Contents || []).map(obj => ({
      s3Key: obj.Key,
      fileSize: obj.Size,
      lastModified: obj.LastModified,
      publicUrl: `https://${S3_BUCKET}.s3.${process.env.REGION || 'ap-south-1'}.amazonaws.com/${obj.Key}`
    }));

    return successResponse(200, {
      success: true,
      message: 'Files retrieved successfully',
      data: {
        userId,
        category: category || 'all',
        files,
        count: files.length,
        totalSize: files.reduce((sum, file) => sum + file.fileSize, 0)
      }
    });
  } catch (error) {
    console.error('ListUserFiles error:', error);
    return errorResponse(500, 'Failed to list files', error.message);
  }
};