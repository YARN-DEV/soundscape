'use client'

import { soundscapeDB, StoredTrack } from '@/lib/indexeddb'

/**
 * Utilities for managing offline track cache
 */

const MAX_CACHE_SIZE = 500 * 1024 * 1024; // 500MB limit

export async function cacheTrackAudio(
  trackId: string,
  audioUrl: string,
  metadata: {
    title: string;
    artist: string;
    artistId: string;
    duration: number;
    coverUrl?: string;
  }
): Promise<void> {
  try {
    // Fetch the audio file
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const size = arrayBuffer.byteLength;

    // Check cache size
    const currentSize = await soundscapeDB.getCacheSize();
    if (currentSize + size > MAX_CACHE_SIZE) {
      throw new Error('Cache is full. Please delete some songs.');
    }

    // Save to IndexedDB
    await soundscapeDB.saveTrack({
      id: trackId,
      title: metadata.title,
      artist: metadata.artist,
      artistId: metadata.artistId,
      audioData: arrayBuffer,
      coverUrl: metadata.coverUrl,
      duration: metadata.duration,
      size,
      storedAt: Date.now(),
    });

    console.log(`Cached track: ${metadata.title}`);
  } catch (error) {
    console.error('Failed to cache track:', error);
    throw error;
  }
}

export async function getOfflineTrack(
  trackId: string
): Promise<StoredTrack | null> {
  try {
    return await soundscapeDB.getTrack(trackId);
  } catch (error) {
    console.error('Failed to get offline track:', error);
    return null;
  }
}

export async function getOfflineTracks(): Promise<StoredTrack[]> {
  try {
    return await soundscapeDB.getAllTracks();
  } catch (error) {
    console.error('Failed to get offline tracks:', error);
    return [];
  }
}

export async function deleteOfflineTrack(trackId: string): Promise<void> {
  try {
    await soundscapeDB.deleteTrack(trackId);
    console.log(`Deleted offline track: ${trackId}`);
  } catch (error) {
    console.error('Failed to delete offline track:', error);
    throw error;
  }
}

export async function getCacheSize(): Promise<string> {
  try {
    const sizeInBytes = await soundscapeDB.getCacheSize();
    return formatBytes(sizeInBytes);
  } catch (error) {
    console.error('Failed to get cache size:', error);
    return '0 KB';
  }
}

export async function clearAllOfflineTracks(): Promise<void> {
  try {
    await soundscapeDB.clearCache();
    console.log('Cleared all offline tracks');
  } catch (error) {
    console.error('Failed to clear offline tracks:', error);
    throw error;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function createAudioBlobUrl(audioData: ArrayBuffer): string {
  const blob = new Blob([audioData], { type: 'audio/mpeg' });
  return URL.createObjectURL(blob);
}
