import Pino from 'pino';
import PinoHttp from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'http';

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = Pino.default({
  name: 'katbox-render',
  level: logLevel,
  formatters: {
    level: (label: string) => {
      return { level: label };
    },
  },
});

export const httpLogger = PinoHttp.default({
  logger,
  customLogLevel: (req: IncomingMessage, res: ServerResponse, err?: Error) => {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      return 'warn';
    } else if (res.statusCode >= 500 || err) {
      return 'error';
    }
    return 'info';
  },
  customSuccessMessage: (req: IncomingMessage, res: ServerResponse) => {
    return `${req.method} ${req.url} completed with ${res.statusCode}`;
  },
  customErrorMessage: (req: IncomingMessage, res: ServerResponse, err: Error) => {
    return `${req.method} ${req.url} failed with ${res.statusCode}`;
  },
});
