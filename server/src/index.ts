import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { logger, httpLogger } from './logger.js';
import { healthRouter } from './routes/health.js';
import { renderRouter } from './routes/render.js';
import { renderService } from './services/render-service.js';
import { jobManager } from './services/job-manager.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(httpLogger);

// Static file serving for rendered videos
app.use('/output', express.static(path.join(process.cwd(), 'output')));

// Routes
app.use('/health', healthRouter);
app.use('/render', renderRouter);

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
  const cleaned = jobManager.cleanupOldJobs(24 * 60 * 60 * 1000);
  if (cleaned > 0) {
    logger.info({ msg: 'Cleaned old jobs', count: cleaned });
  }
}, 60 * 60 * 1000);
