import express, { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../logger.js';
import { assetGenerator } from '../services/asset-generator.js';

export const assetsRouter = express.Router();

/**
 * Zod schema for asset generation request validation
 */
const assetGenerationRequestSchema = z.object({
  storyboardId: z.string().min(1),
  scenes: z
    .array(
      z.object({
        scene_number: z.number().int().positive(),
        duration_seconds: z.number().positive(),
        visual_type: z.enum(['ai-video', 'ai-photo', 'motion-graphics']),
        visual_description: z.string().min(1),
        narration_text: z.string().min(1),
        onscreen_text: z.string().optional(),
        ai_prompt: z.string().min(1),
      })
    )
    .min(1),
});

/**
 * POST / - Start asset generation for a storyboard
 */
assetsRouter.post('/', (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedRequest = assetGenerationRequestSchema.parse(req.body);

    const { storyboardId, scenes } = validatedRequest;

    // Start asset generation job
    const jobId = assetGenerator.startGeneration({
      storyboardId,
      scenes,
    });

    logger.info({
      msg: 'Asset generation job started',
      jobId,
      storyboardId,
      sceneCount: scenes.length,
    });

    // Return 202 Accepted with job info
    res.status(202).json({
      jobId,
      status: 'queued',
      message: 'Asset generation started',
      storyboardId,
      sceneCount: scenes.length,
      statusUrl: `/assets/generate/${jobId}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid asset generation request',
        details: error.errors,
      });
    } else {
      logger.error({
        msg: 'Unexpected error in asset generation endpoint',
        error: String(error),
      });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
});

/**
 * GET /:jobId - Get asset generation job status
 */
assetsRouter.get('/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = assetGenerator.getJob(jobId);

  if (!job) {
    res.status(404).json({
      error: 'Job not found',
    });
    return;
  }

  res.status(200).json({
    jobId: job.id,
    storyboardId: job.storyboardId,
    status: job.status,
    scenes: job.scenes,
    createdAt: job.createdAt.toISOString(),
    completedAt: job.completedAt?.toISOString(),
    error: job.error,
  });
});
