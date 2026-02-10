import express, { Request, Response } from 'express';
import { renderRequestSchema, RenderRequest } from '../types/scene.js';
import { logger } from '../logger.js';
import { z } from 'zod';
import { jobManager } from '../services/job-manager.js';
import { renderService } from '../services/render-service.js';

export const renderRouter = express.Router();

// POST /render - Create a new render job
renderRouter.post('/', (req: Request, res: Response) => {
  try {
    // Validate request body against schema
    const validatedRequest: RenderRequest = renderRequestSchema.parse(req.body);

    const { storyboard_id, scenes } = validatedRequest;
    const total_duration = scenes.reduce((sum, scene) => sum + scene.duration_seconds, 0);

    // Create a job
    const job = jobManager.createJob(storyboard_id, scenes.length, total_duration);

    // Start render asynchronously (fire and forget)
    renderService.startRender(job.id, validatedRequest).catch((err) => {
      logger.error({ msg: 'Unexpected error in startRender', jobId: job.id, error: err.message });
    });

    // Log the request
    logger.info({
      msg: 'Render job created',
      jobId: job.id,
      storyboard_id,
      scene_count: scenes.length,
      total_duration,
    });

    // Return 202 Accepted with job info
    res.status(202).json({
      jobId: job.id,
      status: job.status,
      message: 'Render job created',
      storyboardId: job.storyboardId,
      sceneCount: job.sceneCount,
      totalDurationSeconds: job.totalDurationSeconds,
      statusUrl: `/render/${job.id}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid render request',
        details: error.errors,
      });
    } else {
      logger.error({ msg: 'Unexpected error in render endpoint', error: String(error) });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
});

// GET /render/:jobId - Get job status
renderRouter.get('/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = jobManager.getJob(jobId);

  if (!job) {
    res.status(404).json({
      error: 'Job not found',
    });
    return;
  }

  res.status(200).json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    storyboardId: job.storyboardId,
    sceneCount: job.sceneCount,
    totalDurationSeconds: job.totalDurationSeconds,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString(),
    completedAt: job.completedAt?.toISOString(),
    downloadUrl: job.downloadUrl,
    error: job.error,
  });
});
