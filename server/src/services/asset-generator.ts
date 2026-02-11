/**
 * Asset Generation Service
 *
 * Orchestrates video, photo, and voiceover generation for full storyboards.
 * Each scene type (ai-video, ai-photo, motion-graphics) requires different generation logic.
 * All scenes need voiceover generation.
 */

import { logger } from '../logger.js';
import { kieAiClient } from './kie-ai-client.js';
import { downloadSceneAssets, getAssetUrl } from '../utils/asset-downloader.js';

/**
 * Status for individual asset generation task
 */
export type AssetStatus = 'pending' | 'generating' | 'done' | 'failed';

/**
 * Visual type for a scene
 */
export type VisualType = 'ai-video' | 'ai-photo' | 'motion-graphics';

/**
 * Per-scene asset generation status
 */
export interface AssetSceneStatus {
  sceneNumber: number;
  visualType: VisualType;
  visualStatus: AssetStatus;
  voiceoverStatus: AssetStatus;
  videoUrl?: string;
  photoUrl?: string;
  voiceoverUrl?: string;
  motionConfig?: object;
  error?: string;
}

/**
 * Overall job status
 */
export type AssetGenerationJobStatus = 'queued' | 'generating' | 'completed' | 'failed';

/**
 * Asset generation job
 */
export interface AssetGenerationJob {
  id: string;
  storyboardId: string;
  status: AssetGenerationJobStatus;
  scenes: AssetSceneStatus[];
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Scene input for asset generation
 */
export interface AssetSceneInput {
  scene_number: number;
  duration_seconds: number;
  visual_type: VisualType;
  visual_description: string;
  narration_text: string;
  onscreen_text?: string;
  ai_prompt: string;
}

/**
 * Request to generate assets for a storyboard
 */
export interface AssetGenerationRequest {
  storyboardId: string;
  scenes: AssetSceneInput[];
}

/**
 * Asset Generator Service
 *
 * Manages async asset generation jobs and orchestrates Kie AI API calls
 */
export class AssetGenerator {
  private jobs: Map<string, AssetGenerationJob>;
  private baseUrl: string;

  constructor() {
    this.jobs = new Map();
    this.baseUrl = process.env.RENDER_BASE_URL || 'http://localhost:3000';
  }

  /**
   * Start a new asset generation job
   *
   * @param request - Storyboard ID and scene definitions
   * @returns Job ID for polling
   */
  startGeneration(request: AssetGenerationRequest): string {
    const jobId = crypto.randomUUID();

    // Initialize job with all scenes in pending state
    const job: AssetGenerationJob = {
      id: jobId,
      storyboardId: request.storyboardId,
      status: 'queued',
      scenes: request.scenes.map((scene) => ({
        sceneNumber: scene.scene_number,
        visualType: scene.visual_type,
        visualStatus: 'pending',
        voiceoverStatus: 'pending',
      })),
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);

    logger.info({
      msg: 'Asset generation job created',
      jobId,
      storyboardId: request.storyboardId,
      sceneCount: request.scenes.length,
    });

    // Start processing async (fire and forget)
    this.processJob(jobId, request).catch((err) => {
      logger.error({
        msg: 'Unexpected error in processJob',
        jobId,
        error: err.message,
        stack: err.stack,
      });
    });

    return jobId;
  }

  /**
   * Get job status
   *
   * @param jobId - The job ID to look up
   * @returns Job or undefined if not found
   */
  getJob(jobId: string): AssetGenerationJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Main orchestration loop for asset generation
   *
   * Processes scenes sequentially to avoid overwhelming Kie AI rate limits.
   * Within each scene, visual and voiceover generation run in parallel.
   */
  private async processJob(jobId: string, request: AssetGenerationRequest): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      logger.error({ msg: 'Job not found in processJob', jobId });
      return;
    }

    // Update status to generating
    job.status = 'generating';
    this.jobs.set(jobId, job);

    logger.info({
      msg: 'Starting asset generation',
      jobId,
      storyboardId: request.storyboardId,
      sceneCount: request.scenes.length,
    });

    let failedScenes = 0;

    // Process scenes sequentially
    for (let i = 0; i < request.scenes.length; i++) {
      const sceneInput = request.scenes[i];
      const sceneStatus = job.scenes[i];

      logger.info({
        msg: 'Processing scene',
        jobId,
        sceneNumber: sceneInput.scene_number,
        visualType: sceneInput.visual_type,
      });

      // Generate visual and voiceover in parallel
      const results = await Promise.allSettled([
        this.generateVisual(jobId, sceneInput, sceneStatus),
        this.generateVoiceover(jobId, sceneInput, sceneStatus),
      ]);

      // Check results
      const visualResult = results[0];
      const voiceoverResult = results[1];

      if (visualResult.status === 'rejected') {
        logger.error({
          msg: 'Visual generation failed',
          jobId,
          sceneNumber: sceneInput.scene_number,
          error: visualResult.reason,
        });
        sceneStatus.visualStatus = 'failed';
        sceneStatus.error = `Visual: ${visualResult.reason}`;
        failedScenes++;
      }

      if (voiceoverResult.status === 'rejected') {
        logger.error({
          msg: 'Voiceover generation failed',
          jobId,
          sceneNumber: sceneInput.scene_number,
          error: voiceoverResult.reason,
        });
        sceneStatus.voiceoverStatus = 'failed';
        sceneStatus.error = sceneStatus.error
          ? `${sceneStatus.error}; Voiceover: ${voiceoverResult.reason}`
          : `Voiceover: ${voiceoverResult.reason}`;
        failedScenes++;
      }

      // Update job after each scene
      this.jobs.set(jobId, job);
    }

    // Mark job as complete or failed
    if (failedScenes === 0) {
      job.status = 'completed';
      logger.info({
        msg: 'Asset generation completed successfully',
        jobId,
        storyboardId: request.storyboardId,
      });
    } else {
      job.status = 'failed';
      job.error = `${failedScenes} of ${request.scenes.length} scenes failed`;
      logger.error({
        msg: 'Asset generation completed with failures',
        jobId,
        storyboardId: request.storyboardId,
        failedScenes,
        totalScenes: request.scenes.length,
      });
    }

    job.completedAt = new Date();
    this.jobs.set(jobId, job);
  }

  /**
   * Generate visual asset for a scene based on visual type
   */
  private async generateVisual(
    jobId: string,
    sceneInput: AssetSceneInput,
    sceneStatus: AssetSceneStatus
  ): Promise<void> {
    sceneStatus.visualStatus = 'generating';

    const sceneId = `${jobId}-scene${sceneInput.scene_number}`;

    if (sceneInput.visual_type === 'ai-video') {
      // Generate video via Kling 2.6
      logger.info({
        msg: 'Generating AI video',
        jobId,
        sceneNumber: sceneInput.scene_number,
        prompt: sceneInput.ai_prompt,
      });

      const resultUrls = await kieAiClient.generateVideo({
        prompt: sceneInput.ai_prompt,
        aspect_ratio: '9:16',
        duration: '5',
        sound: false,
      });

      // Download and persist video
      const downloaded = await downloadSceneAssets(
        sceneId,
        { videoUrl: resultUrls[0] },
        this.baseUrl
      );

      sceneStatus.videoUrl = downloaded.videoUrl;
      sceneStatus.visualStatus = 'done';

      logger.info({
        msg: 'AI video generated',
        jobId,
        sceneNumber: sceneInput.scene_number,
        videoUrl: sceneStatus.videoUrl,
      });
    } else if (sceneInput.visual_type === 'ai-photo') {
      // Generate photo via Flux 2 Pro
      logger.info({
        msg: 'Generating AI photo',
        jobId,
        sceneNumber: sceneInput.scene_number,
        prompt: sceneInput.ai_prompt,
      });

      const resultUrls = await kieAiClient.generatePhoto({
        prompt: sceneInput.ai_prompt,
        aspect_ratio: '9:16',
        resolution: '1K',
      });

      // Download and persist photo
      const downloaded = await downloadSceneAssets(
        sceneId,
        { photoUrl: resultUrls[0] },
        this.baseUrl
      );

      sceneStatus.photoUrl = downloaded.photoUrl;
      sceneStatus.visualStatus = 'done';

      logger.info({
        msg: 'AI photo generated',
        jobId,
        sceneNumber: sceneInput.scene_number,
        photoUrl: sceneStatus.photoUrl,
      });
    } else if (sceneInput.visual_type === 'motion-graphics') {
      // Motion graphics: create config object locally (no API call)
      logger.info({
        msg: 'Creating motion graphics config',
        jobId,
        sceneNumber: sceneInput.scene_number,
      });

      sceneStatus.motionConfig = {
        text: sceneInput.onscreen_text || sceneInput.visual_description,
        duration: sceneInput.duration_seconds,
        style: 'branded',
      };

      sceneStatus.visualStatus = 'done';

      logger.info({
        msg: 'Motion graphics config created',
        jobId,
        sceneNumber: sceneInput.scene_number,
        config: sceneStatus.motionConfig,
      });
    }
  }

  /**
   * Generate voiceover for a scene
   */
  private async generateVoiceover(
    jobId: string,
    sceneInput: AssetSceneInput,
    sceneStatus: AssetSceneStatus
  ): Promise<void> {
    sceneStatus.voiceoverStatus = 'generating';

    const sceneId = `${jobId}-scene${sceneInput.scene_number}`;

    logger.info({
      msg: 'Generating voiceover',
      jobId,
      sceneNumber: sceneInput.scene_number,
      text: sceneInput.narration_text,
    });

    // Generate voiceover via ElevenLabs
    const resultUrls = await kieAiClient.generateVoiceover({
      text: sceneInput.narration_text,
      voice: 'Rachel',
      stability: 0.5,
      similarity_boost: 0.75,
      speed: 1.0,
    });

    // Download and persist voiceover
    const downloaded = await downloadSceneAssets(
      sceneId,
      { voiceoverUrl: resultUrls[0] },
      this.baseUrl
    );

    sceneStatus.voiceoverUrl = downloaded.voiceoverUrl;
    sceneStatus.voiceoverStatus = 'done';

    logger.info({
      msg: 'Voiceover generated',
      jobId,
      sceneNumber: sceneInput.scene_number,
      voiceoverUrl: sceneStatus.voiceoverUrl,
    });
  }

  /**
   * Clean up old jobs
   *
   * @param maxAge - Maximum age in milliseconds
   * @returns Number of jobs cleaned up
   */
  cleanupOldJobs(maxAge: number): number {
    const cutoffTime = Date.now() - maxAge;
    let cleaned = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.createdAt.getTime() < cutoffTime) {
        this.jobs.delete(jobId);
        cleaned++;
      }
    }

    return cleaned;
  }
}

/**
 * Singleton instance
 */
export const assetGenerator = new AssetGenerator();
