// STUB: Phase 2 will implement actual Remotion rendering. This validates input and returns a placeholder response.

import express, { Request, Response } from 'express';
import { renderRequestSchema, RenderRequest } from '../types/scene.js';
import { logger } from '../logger.js';
import { z } from 'zod';

export const renderRouter = express.Router();

renderRouter.post('/', (req: Request, res: Response) => {
  try {
    // Validate request body against schema
    const validatedRequest: RenderRequest = renderRequestSchema.parse(req.body);

    const { storyboard_id, scenes } = validatedRequest;
    const total_duration = scenes.reduce((sum, scene) => sum + scene.duration_seconds, 0);

    // Log the request
    logger.info({
      msg: 'Render request received',
      storyboard_id,
      scene_count: scenes.length,
      total_duration,
    });

    // Return stub response
    res.status(202).json({
      message: 'Render request accepted (stub)',
      storyboard_id,
      scene_count: scenes.length,
      total_duration_seconds: total_duration,
      status: 'PENDING',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid render request',
        details: error.errors,
      });
    } else {
      throw error; // Let global error handler catch it
    }
  }
});
