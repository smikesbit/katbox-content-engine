import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { logger, httpLogger } from './logger.js';
import { healthRouter } from './routes/health.js';
import { renderRouter } from './routes/render.js';
import { assetsRouter } from './routes/assets.js';
import { storyboardRouter } from './routes/storyboard.js';
import { renderService } from './services/render-service.js';
import { jobManager } from './services/job-manager.js';
import { assetGenerator } from './services/asset-generator.js';
import { storyboardGenerator } from './services/storyboard-generator.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(httpLogger);

// Static file serving for rendered videos
app.use('/output', express.static(path.join(process.cwd(), 'output')));

// Static file serving for generated assets
app.use('/assets', express.static(path.join(process.cwd(), 'assets')));

// Routes
app.use('/health', healthRouter);
app.use('/render', renderRouter);
app.use('/assets/generate', assetsRouter);
app.use('/storyboard/generate', storyboardRouter);

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).id || 'unknown';

  logger.error({
    msg: 'Unhandled error',
    error: err.message,
    stack: err.stack,
    requestId,
    method: req.method,
    url: req.url,
  });

  res.status(500).json({
    error: 'Internal server error',
    requestId,
  });
});

// Start server
app.listen(PORT, () => {
  logger.info({
    msg: 'Katbox render server started',
    port: PORT,
  });

  // Pre-warm Remotion bundle (non-blocking)
  renderService.ensureBundle()
    .then(() => logger.info({ msg: 'Remotion bundle ready' }))
    .catch((err) => logger.error({ msg: 'Bundle failed', error: err.message }));
});

// Periodic job cleanup (every 1 hour, remove jobs older than 24 hours)
setInterval(() => {
  const cleanedRenderJobs = jobManager.cleanupOldJobs(24 * 60 * 60 * 1000);
  if (cleanedRenderJobs > 0) {
    logger.info({ msg: 'Cleaned old render jobs', count: cleanedRenderJobs });
  }

  const cleanedAssetJobs = assetGenerator.cleanupOldJobs(24 * 60 * 60 * 1000);
  if (cleanedAssetJobs > 0) {
    logger.info({ msg: 'Cleaned old asset jobs', count: cleanedAssetJobs });
  }

  const cleanedStoryboardJobs = storyboardGenerator.cleanupOldJobs(24 * 60 * 60 * 1000);
  if (cleanedStoryboardJobs > 0) {
    logger.info({ msg: 'Cleaned old storyboard jobs', count: cleanedStoryboardJobs });
  }
}, 60 * 60 * 1000);
