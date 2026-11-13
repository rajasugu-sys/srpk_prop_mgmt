/**
 * Client-side persistent file storage using IndexedDB with in-memory fallback.
 * Allows storing large PDF files and receipt images without localStorage quota limits.
 */

export interface StoredDocument {
  id: string; // Unique key e.g. "tenant-agreement-TNT-101"
  name: string; // Original filename e.g. "Lease_Agreement_TNT101.pdf"
  file_type: string; // MIME type e.g. "application/pdf", "image/png"
  size: number; // File size in bytes
  uploaded_at: string; // ISO date string
  data_url: string; // Base64 data URL
}

const DB_NAME = 'srkp_attachments_db_v1';
const STORE_NAME = 'documents';
const DB_VERSION = 1;

// In-memory fallback in case IndexedDB is unavailable
const memoryCache = new Map<string, StoredDocument>();

/**
 * Open or initialize the IndexedDB instance
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

/**
 * Save a document into IndexedDB
 */
export async function saveDocument(doc: StoredDocument): Promise<void> {
  memoryCache.set(doc.id, doc);

  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(doc);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Failed to save document'));
      transaction.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('IndexedDB save failed, document kept in memory cache:', err);
  }
}

/**
 * Retrieve a document by ID from IndexedDB
 */
export async function getDocument(id: string): Promise<StoredDocument | null> {
  if (memoryCache.has(id)) {
    return memoryCache.get(id) || null;
  }

  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result as StoredDocument | undefined;
        if (result) {
          memoryCache.set(result.id, result);
          resolve(result);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error || new Error('Failed to read document'));
      transaction.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('IndexedDB read failed:', err);
    return null;
  }
}

/**
 * Read a browser File object as a base64 Data URL
 */
export function readFileAsDataUrl(file: File): Promise<{
  name: string;
  size: number;
  file_type: string;
  data_url: string;
}> {
  return new Promise((resolve, reject) => {
    // Check file size (limit to 15MB)
    const MAX_BYTES = 15 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      reject(new Error(`File size (${formatFileSize(file.size)}) exceeds the maximum allowed limit of 15 MB.`));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve({
          name: file.name,
          size: file.size,
          file_type: file.type || 'application/octet-stream',
          data_url: reader.result,
        });
      } else {
        reject(new Error('Failed to read file as text/data URL'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('File read error'));
    reader.readAsDataURL(file);
  });
}

/**
 * Trigger download of a file from Data URL
 */
export function downloadDataUrl(filename: string, dataUrl: string): void {
  try {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error('Download failed:', err);
  }
}

/**
 * Format bytes into human readable format (KB, MB)
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
