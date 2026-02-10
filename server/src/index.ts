import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { logger, httpLogger } from './logger.js';
import { healthRouter } from './routes/health.js';
import { renderRouter } from './routes/render.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(httpLogger);

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
});
