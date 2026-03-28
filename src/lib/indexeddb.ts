/**
 * IndexedDB utilities for offline song storage
 */

const DB_NAME = 'SoundscapeDB';
const DB_VERSION = 1;
const TRACKS_STORE = 'tracks';
const CACHE_STORE = 'cache_metadata';

interface StoredTrack {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  audioData: ArrayBuffer;
  coverUrl?: string;
  duration: number;
  size: number;
  storedAt: number;
}

interface CacheMetadata {
  trackId: string;
  size: number;
  cachedAt: number;
  expiresAt?: number;
}

class SoundscapeDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create tracks store
        if (!db.objectStoreNames.contains(TRACKS_STORE)) {
          const trackStore = db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
          trackStore.createIndex('storedAt', 'storedAt', { unique: false });
        }

        // Create cache metadata store
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          const cacheStore = db.createObjectStore(CACHE_STORE, { keyPath: 'trackId' });
          cacheStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        }
      };
    });
  }

  async saveTrack(track: StoredTrack): Promise<void> {
    const db = this.db || (await this.init());

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TRACKS_STORE, CACHE_STORE], 'readwrite');
      const trackStore = transaction.objectStore(TRACKS_STORE);
      const cacheStore = transaction.objectStore(CACHE_STORE);

      trackStore.put(track)
      cacheStore.put({
        trackId: track.id,
        size: track.size,
        cachedAt: Date.now(),
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Failed to save track'));
    });
  }

  async getTrack(id: string): Promise<StoredTrack | null> {
    const db = this.db || (await this.init());

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TRACKS_STORE], 'readonly');
      const store = transaction.objectStore(TRACKS_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => {
        reject(new Error('Failed to get track'));
      };
    });
  }

  async getAllTracks(): Promise<StoredTrack[]> {
    const db = this.db || (await this.init());

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TRACKS_STORE], 'readonly');
      const store = transaction.objectStore(TRACKS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(new Error('Failed to get tracks'));
      };
    });
  }

  async deleteTrack(id: string): Promise<void> {
    const db = this.db || (await this.init());

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TRACKS_STORE, CACHE_STORE], 'readwrite');
      const trackStore = transaction.objectStore(TRACKS_STORE);
      const cacheStore = transaction.objectStore(CACHE_STORE);

      trackStore.delete(id);
      cacheStore.delete(id);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Failed to delete track'));
    });
  }

  async getCacheSize(): Promise<number> {
    const db = this.db || (await this.init());

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CACHE_STORE], 'readonly');
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const totalSize = request.result.reduce((sum, item) => sum + (item.size || 0), 0);
        resolve(totalSize);
      };
      request.onerror = () => {
        reject(new Error('Failed to get cache size'));
      };
    });
  }

  async clearCache(): Promise<void> {
    const db = this.db || (await this.init());

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TRACKS_STORE, CACHE_STORE], 'readwrite');
      transaction.objectStore(TRACKS_STORE).clear();
      transaction.objectStore(CACHE_STORE).clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Failed to clear cache'));
    });
  }
}

export const soundscapeDB = new SoundscapeDB();
export type { StoredTrack, CacheMetadata };
