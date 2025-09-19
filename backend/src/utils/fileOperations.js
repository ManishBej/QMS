// Secure file operations utility
import path from 'path';
import { promises as fs } from 'fs';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

// Allowed directories for file operations (whitelist approach)
const ALLOWED_DIRECTORIES = [
  path.resolve(process.cwd(), 'exports'),
  path.resolve(process.cwd(), 'temp'),
  path.resolve(process.cwd(), 'uploads') // for future file upload features
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.json', '.csv', '.xlsx', '.txt', '.log'];

/**
 * Validates and sanitizes file paths to prevent path traversal attacks
 */
export function validateFilePath(filePath, allowedDir = null) {
  try {
    // Normalize the path to resolve any relative components
    const normalizedPath = path.normalize(filePath);
    const resolvedPath = path.resolve(normalizedPath);
    
    // Check for path traversal attempts
    if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
      throw new Error('Path traversal detected');
    }
    
    // Validate against allowed directories
    const allowedDirs = allowedDir ? [path.resolve(allowedDir)] : ALLOWED_DIRECTORIES;
    const isAllowed = allowedDirs.some(allowedPath => 
      resolvedPath.startsWith(allowedPath + path.sep) || resolvedPath === allowedPath
    );
    
    if (!isAllowed) {
      throw new Error(`Path not in allowed directories: ${resolvedPath}`);
    }
    
    // Validate file extension
    const ext = path.extname(resolvedPath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Error(`File extension not allowed: ${ext}`);
    }
    
    return resolvedPath;
  } catch (error) {
    logger.error('File path validation failed', { 
      originalPath: filePath, 
      error: error.message 
    });
    throw error;
  }
}

/**
 * Secure file write operation
 */
export async function secureWriteFile(filePath, data, options = {}) {
  try {
    const validatedPath = validateFilePath(filePath);
    
    // Ensure directory exists
    const dir = path.dirname(validatedPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Generate temporary file name
    const tempPath = `${validatedPath}.tmp.${crypto.randomBytes(8).toString('hex')}`;
    
    // Write to temporary file first
    await fs.writeFile(tempPath, data, options);
    
    // Atomic move to final location
    await fs.rename(tempPath, validatedPath);
    
    logger.info('File written securely', { path: validatedPath });
    return validatedPath;
    
  } catch (error) {
    logger.error('Secure file write failed', { 
      path: filePath, 
      error: error.message 
    });
    throw error;
  }
}

/**
 * Secure file read operation
 */
export async function secureReadFile(filePath, options = {}) {
  try {
    const validatedPath = validateFilePath(filePath);
    
    // Check if file exists and is readable
    await fs.access(validatedPath, fs.constants.R_OK);
    
    const data = await fs.readFile(validatedPath, options);
    
    logger.info('File read securely', { path: validatedPath });
    return data;
    
  } catch (error) {
    logger.error('Secure file read failed', { 
      path: filePath, 
      error: error.message 
    });
    throw error;
  }
}

/**
 * Secure directory creation
 */
export async function secureCreateDirectory(dirPath) {
  try {
    const validatedPath = validateFilePath(path.join(dirPath, 'dummy.txt'));
    const dir = path.dirname(validatedPath);
    
    await fs.mkdir(dir, { recursive: true });
    
    logger.info('Directory created securely', { path: dir });
    return dir;
    
  } catch (error) {
    logger.error('Secure directory creation failed', { 
      path: dirPath, 
      error: error.message 
    });
    throw error;
  }
}

/**
 * Generate secure filename with timestamp and random component
 */
export function generateSecureFilename(prefix = 'file', extension = '.json') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${timestamp}_${random}${extension}`;
}

/**
 * Clean up old files in a directory (retention policy)
 */
export async function cleanupOldFiles(dirPath, maxAgeMs = 7 * 24 * 60 * 60 * 1000) { // 7 days default
  try {
    const validatedDir = path.dirname(validateFilePath(path.join(dirPath, 'dummy.txt')));
    
    const files = await fs.readdir(validatedDir);
    const now = Date.now();
    let cleaned = 0;
    
    for (const file of files) {
      const filePath = path.join(validatedDir, file);
      try {
        const stats = await fs.stat(filePath);
        if (now - stats.mtime.getTime() > maxAgeMs) {
          await fs.unlink(filePath);
          cleaned++;
        }
      } catch (error) {
        logger.warn('Failed to clean up file', { file: filePath, error: error.message });
      }
    }
    
    if (cleaned > 0) {
      logger.info('Old files cleaned up', { directory: validatedDir, count: cleaned });
    }
    
    return cleaned;
    
  } catch (error) {
    logger.error('File cleanup failed', { directory: dirPath, error: error.message });
    throw error;
  }
}

export default {
  validateFilePath,
  secureWriteFile,
  secureReadFile,
  secureCreateDirectory,
  generateSecureFilename,
  cleanupOldFiles
};
