/**
 * Asset Download Utility
 *
 * Downloads generated assets from expiring URLs and persists them to local VPS storage.
 * Kie AI asset URLs expire after 24 hours, so we download immediately after generation.
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from '../logger.js';

/**
 * Local storage directory for downloaded assets
 */
export const ASSETS_DIR = path.resolve(process.cwd(), 'assets');

/**
 * Ensure assets directory exists
 */
async function ensureAssetsDir(): Promise<void> {
  await fs.mkdir(ASSETS_DIR, { recursive: true });
}

/**
 * Download an asset from a URL and save to local filesystem
 *
 * @param url - The URL to download from
 * @param filename - The local filename to save as
 * @returns The absolute path to the downloaded file
 */
export async function downloadAsset(url: string, filename: string): Promise<string> {
  await ensureAssetsDir();

  logger.info({
    msg: 'Downloading asset',
    url,
    filename,
  });

  const response = await fetch(url);

  if (!response.ok) {
    logger.error({
      msg: 'Asset download failed',
      url,
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(`Failed to download asset from ${url}: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const filePath = path.join(ASSETS_DIR, filename);

  await fs.writeFile(filePath, buffer);

  logger.info({
    msg: 'Asset downloaded',
    url,
    filename,
    size: buffer.byteLength,
    path: filePath,
  });

  return filePath;
}

/**
 * Generate a public URL for a locally stored asset
 *
 * @param filename - The asset filename
 * @param baseUrl - The base URL of the render server (e.g., https://render.digitalcallum.com)
 * @returns The public URL to access the asset
 */
export function getAssetUrl(filename: string, baseUrl: string): string {
  // Remove trailing slash from baseUrl if present
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  return `${cleanBaseUrl}/assets/${filename}`;
}

/**
 * Download all assets for a scene and return both local paths and public URLs
 *
 * @param sceneId - The scene identifier (used for filename generation)
 * @param urls - Object containing URLs for video, photo, and/or voiceover
 * @param baseUrl - The base URL of the render server
 * @returns Object with local paths and public URLs for each asset type
 */
export async function downloadSceneAssets(
  sceneId: string,
  urls: {
    videoUrl?: string;
    photoUrl?: string;
    voiceoverUrl?: string;
  },
  baseUrl: string
): Promise<{
  videoPath?: string;
  photoPath?: string;
  voiceoverPath?: string;
  videoUrl?: string;
  photoUrl?: string;
  voiceoverUrl?: string;
}> {
  const result: {
    videoPath?: string;
    photoPath?: string;
    voiceoverPath?: string;
    videoUrl?: string;
    photoUrl?: string;
    voiceoverUrl?: string;
  } = {};

  let assetsDownloaded = 0;

  if (urls.videoUrl) {
    const filename = `${sceneId}-video.mp4`;
    result.videoPath = await downloadAsset(urls.videoUrl, filename);
    result.videoUrl = getAssetUrl(filename, baseUrl);
    assetsDownloaded++;
  }

  if (urls.photoUrl) {
    const filename = `${sceneId}-photo.jpg`;
    result.photoPath = await downloadAsset(urls.photoUrl, filename);
    result.photoUrl = getAssetUrl(filename, baseUrl);
    assetsDownloaded++;
  }

  if (urls.voiceoverUrl) {
    const filename = `${sceneId}-voiceover.mp3`;
    result.voiceoverPath = await downloadAsset(urls.voiceoverUrl, filename);
    result.voiceoverUrl = getAssetUrl(filename, baseUrl);
    assetsDownloaded++;
  }

  logger.info({
    msg: 'Scene assets downloaded',
    sceneId,
    assetsDownloaded,
  });

  return result;
}
