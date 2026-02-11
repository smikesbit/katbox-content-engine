import express, { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../logger.js';
import { storyboardGenerator } from '../services/storyboard-generator.js';

export const storyboardRouter = express.Router();

/**
 * Zod schema for storyboard generation request validation
 */
const storyboardGenerationRequestSchema = z.object({
  topicId: z.string().min(1),
  topicTitle: z.string().min(1),
  topicSummary: z.string().min(1),
  contentPillar: z.string().min(1),
});

/**
 * POST / - Start storyboard generation
 */
storyboardRouter.post('/', (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedRequest = storyboardGenerationRequestSchema.parse(req.body);

    const { topicId, topicTitle, topicSummary, contentPillar } = validatedRequest;

    // Start storyboard generation job
    const jobId = storyboardGenerator.startGeneration({
      topicId,
      topicTitle,
      topicSummary,
      contentPillar,
    });

    logger.info({
      msg: 'Storyboard generation job started',
      jobId,
      topicId,
      topicTitle,
    });

    // Return 202 Accepted with job info
    res.status(202).json({
      jobId,
      status: 'queued',
      message: 'Storyboard generation started',
      topicId,
      statusUrl: `/storyboard/generate/${jobId}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid storyboard generation request',
        details: error.errors,
      });
    } else {
      logger.error({
        msg: 'Unexpected error in storyboard generation endpoint',
        error: String(error),
      });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
});

/**
 * GET /:jobId - Get storyboard generation job status
 */
storyboardRouter.get('/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = storyboardGenerator.getJob(jobId);

  if (!job) {
    res.status(404).json({
      error: 'Job not found',
    });
    return;
  }

  res.status(200).json({
    jobId: job.id,
    topicId: job.topicId,
    topicTitle: job.topicTitle,
    storyboardId: job.storyboardId,
    status: job.status,
    scenes: job.scenes,
    createdAt: job.createdAt.toISOString(),
    completedAt: job.completedAt?.toISOString(),
    error: job.error,
  });
});
