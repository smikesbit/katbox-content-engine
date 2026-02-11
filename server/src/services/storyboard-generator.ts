/**
 * Storyboard Generation Service
 *
 * Uses OpenAI GPT-4o to generate structured, scene-by-scene storyboards for 60-second videos.
 * Enforces exact 60-second total duration and outputs all required scene fields.
 */

import { logger } from '../logger.js';

/**
 * Visual type for a scene
 */
export type VisualType = 'ai-video' | 'ai-photo' | 'motion-graphics';

/**
 * Storyboard scene structure
 */
export interface StoryboardScene {
  scene_number: number;
  duration_seconds: number;
  visual_description: string;
  visual_type: VisualType;
  narration_text: string;
  onscreen_text: string;
  ai_prompt: string;
}

/**
 * Job status lifecycle
 */
export type StoryboardGenerationJobStatus = 'queued' | 'generating' | 'completed' | 'failed';

/**
 * Storyboard generation job
 */
export interface StoryboardGenerationJob {
  id: string;
  topicId: string;
  topicTitle: string;
  status: StoryboardGenerationJobStatus;
  storyboardId: string;
  scenes: StoryboardScene[];
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Request to generate a storyboard
 */
export interface StoryboardGenerationRequest {
  topicId: string;
  topicTitle: string;
  topicSummary: string;
  contentPillar: string;
}

/**
 * OpenAI API response structure for chat completions
 */
interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * LLM response structure
 */
interface LLMStoryboardResponse {
  scenes: StoryboardScene[];
}

/**
 * Storyboard Generator Service
 *
 * Manages async storyboard generation jobs and orchestrates OpenAI API calls
 */
export class StoryboardGenerator {
  private jobs: Map<string, StoryboardGenerationJob>;
  private apiKey: string;

  constructor() {
    this.jobs = new Map();
    this.apiKey = process.env.OPENAI_API_KEY || '';

    if (!this.apiKey) {
      logger.warn({ msg: 'OPENAI_API_KEY not set - storyboard generation will fail' });
    }
  }

  /**
   * Start a new storyboard generation job
   *
   * @param request - Topic information for storyboard generation
   * @returns Job ID for polling
   */
  startGeneration(request: StoryboardGenerationRequest): string {
    const jobId = crypto.randomUUID();
    const storyboardId = `SB-${request.topicId}`;

    // Initialize job
    const job: StoryboardGenerationJob = {
      id: jobId,
      topicId: request.topicId,
      topicTitle: request.topicTitle,
      status: 'queued',
      storyboardId,
      scenes: [],
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);

    logger.info({
      msg: 'Storyboard generation job created',
      jobId,
      topicId: request.topicId,
      storyboardId,
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
  getJob(jobId: string): StoryboardGenerationJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Main orchestration loop for storyboard generation
   */
  private async processJob(jobId: string, request: StoryboardGenerationRequest): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      logger.error({ msg: 'Job not found in processJob', jobId });
      return;
    }

    // Update status to generating
    job.status = 'generating';
    this.jobs.set(jobId, job);

    logger.info({
      msg: 'Starting storyboard generation',
      jobId,
      topicId: request.topicId,
      topicTitle: request.topicTitle,
    });

    try {
      // Generate storyboard via LLM
      const scenes = await this.generateStoryboard(request);

      // Store scenes and mark as completed
      job.scenes = scenes;
      job.status = 'completed';
      job.completedAt = new Date();

      logger.info({
        msg: 'Storyboard generation completed successfully',
        jobId,
        topicId: request.topicId,
        sceneCount: scenes.length,
      });
    } catch (error) {
      // Mark as failed
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();

      logger.error({
        msg: 'Storyboard generation failed',
        jobId,
        topicId: request.topicId,
        error: job.error,
      });
    }

    this.jobs.set(jobId, job);
  }

  /**
   * Generate storyboard using OpenAI API
   */
  private async generateStoryboard(request: StoryboardGenerationRequest): Promise<StoryboardScene[]> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    const systemPrompt = `You are a video storyboard generator for Katbox, a Filipino meal box packaging company. You create scene-by-scene storyboards for 60-second vertical (9:16) social media videos.

RULES:
1. Total duration across ALL scenes MUST equal exactly 60 seconds.
2. Each scene duration must be between 3 and 15 seconds.
3. Use 4-8 scenes per video (typical: 5-6 scenes).
4. visual_type must be one of: "ai-video", "ai-photo", "motion-graphics"
5. Use "motion-graphics" for text-heavy scenes (intro hooks, CTAs, key stats).
6. Use "ai-photo" for product showcases, food imagery, lifestyle shots.
7. Use "ai-video" sparingly (1-2 per video max) for dynamic action shots.
8. narration_text MUST be in Taglish (mix of Tagalog and English, natural Filipino speech).
9. ai_prompt must be detailed, visual, and optimized for AI image/video generation.
10. onscreen_text should be short, punchy text overlays (English preferred for readability).
11. First scene should be a hook (grab attention in 3 seconds).
12. Last scene should be a call-to-action.

Respond with a JSON object: { "scenes": [...] }
Each scene: { "scene_number": N, "duration_seconds": N, "visual_description": "...", "visual_type": "...", "narration_text": "...", "onscreen_text": "...", "ai_prompt": "..." }`;

    const userPrompt = `Create a 60-second video storyboard for this topic:

Title: ${request.topicTitle}
Summary: ${request.topicSummary}
Content Pillar: ${request.contentPillar}

Remember: scenes must total EXACTLY 60 seconds.`;

    logger.info({
      msg: 'Calling OpenAI API',
      topicId: request.topicId,
      model: 'gpt-4o',
    });

    // Call OpenAI API with native fetch
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json() as OpenAIResponse;
    const content = data.choices[0].message.content;

    logger.info({
      msg: 'OpenAI API response received',
      topicId: request.topicId,
      responseLength: content.length,
    });

    // Parse LLM response
    let llmResponse: LLMStoryboardResponse;
    try {
      llmResponse = JSON.parse(content);
    } catch (error) {
      throw new Error('Failed to parse LLM JSON response');
    }

    if (!llmResponse.scenes || !Array.isArray(llmResponse.scenes)) {
      throw new Error('LLM response missing scenes array');
    }

    // Validate and enforce 60-second duration
    const scenes = this.enforceDuration(llmResponse.scenes);

    return scenes;
  }

  /**
   * Enforce exact 60-second total duration
   */
  private enforceDuration(scenes: StoryboardScene[]): StoryboardScene[] {
    // Validate all required fields are present
    for (const scene of scenes) {
      if (
        typeof scene.scene_number !== 'number' ||
        typeof scene.duration_seconds !== 'number' ||
        typeof scene.visual_description !== 'string' ||
        typeof scene.visual_type !== 'string' ||
        typeof scene.narration_text !== 'string' ||
        typeof scene.onscreen_text !== 'string' ||
        typeof scene.ai_prompt !== 'string'
      ) {
        throw new Error(`Scene ${scene.scene_number || '?'} is missing required fields`);
      }

      if (!['ai-video', 'ai-photo', 'motion-graphics'].includes(scene.visual_type)) {
        throw new Error(`Scene ${scene.scene_number} has invalid visual_type: ${scene.visual_type}`);
      }
    }

    // Calculate current total duration
    const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration_seconds, 0);
    const targetDuration = 60;
    const difference = targetDuration - totalDuration;

    if (difference === 0) {
      logger.info({
        msg: 'LLM generated exact 60-second duration',
        sceneCount: scenes.length,
      });
      return scenes;
    }

    logger.warn({
      msg: 'Adjusting duration to hit 60 seconds',
      totalDuration,
      targetDuration,
      difference,
    });

    // Try to adjust last scene first
    const lastScene = scenes[scenes.length - 1];
    const adjustedLastDuration = lastScene.duration_seconds + difference;

    // If adjustment keeps last scene in valid range (3-15s), use it
    if (adjustedLastDuration >= 3 && adjustedLastDuration <= 15) {
      lastScene.duration_seconds = adjustedLastDuration;
      logger.info({
        msg: 'Adjusted last scene duration',
        oldDuration: lastScene.duration_seconds - difference,
        newDuration: lastScene.duration_seconds,
      });
      return scenes;
    }

    // Otherwise, distribute proportionally across all scenes
    logger.info({
      msg: 'Redistributing duration proportionally across all scenes',
      sceneCount: scenes.length,
    });

    const proportions = scenes.map((s) => s.duration_seconds / totalDuration);

    for (let i = 0; i < scenes.length; i++) {
      scenes[i].duration_seconds = Math.round(proportions[i] * targetDuration);
    }

    // Handle rounding errors - adjust last scene to hit exactly 60
    const newTotal = scenes.reduce((sum, s) => sum + s.duration_seconds, 0);
    const finalDifference = targetDuration - newTotal;
    scenes[scenes.length - 1].duration_seconds += finalDifference;

    logger.info({
      msg: 'Duration redistribution complete',
      finalTotal: scenes.reduce((sum, s) => sum + s.duration_seconds, 0),
    });

    return scenes;
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
export const storyboardGenerator = new StoryboardGenerator();
