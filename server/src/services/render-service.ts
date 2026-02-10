import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import * as path from 'path';
import * as fs from 'fs/promises';
import { logger } from '../logger.js';
import { jobManager } from './job-manager.js';
import { RenderRequest } from '../types/scene.js';

export class RenderService {
  private bundleLocation: string | null = null;
  private outputDir: string;
  private baseUrl: string;

  constructor() {
    this.outputDir = path.resolve(process.cwd(), 'output');
    this.baseUrl = process.env.RENDER_BASE_URL || 'http://localhost:3000';
  }

  async ensureBundle(): Promise<string> {
    if (this.bundleLocation) {
      return this.bundleLocation;
    }

    logger.info({ msg: 'Creating Remotion bundle' });

    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });

    const entryPoint = path.resolve(process.cwd(), 'src/remotion/index.ts');
    this.bundleLocation = await bundle({
      entryPoint,
      webpackOverride: (config) => {
        // NodeNext module resolution uses .js extensions in imports (e.g. './Root.js')
        // but the actual files are .ts/.tsx. Tell webpack to resolve .js → .ts/.tsx.
        config.resolve = {
          ...config.resolve,
          extensionAlias: {
            '.js': ['.js', '.ts', '.tsx'],
          },
        };
        return config;
      },
    });

    logger.info({ msg: 'Remotion bundle created', location: this.bundleLocation });
    return this.bundleLocation;
  }

  async startRender(jobId: string, renderRequest: RenderRequest): Promise<void> {
    try {
      // Update job status to bundling
      jobManager.updateJob(jobId, { status: 'bundling' });
      logger.info({ msg: 'Starting render', jobId, storyboardId: renderRequest.storyboard_id });

      // Ensure bundle is ready
      const bundleLocation = await this.ensureBundle();

      // Update job status to rendering
      jobManager.updateJob(jobId, { status: 'rendering', startedAt: new Date() });

      // Select composition
      const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: 'KatboxVideo',
        inputProps: {
          scenes: renderRequest.scenes,
          branding: renderRequest.branding,
        },
      });

      logger.info({ msg: 'Composition selected', jobId, composition: composition.id });

      // Define output path
      const outputPath = path.join(this.outputDir, `${jobId}.mp4`);

      // Render video
      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: 'h264',
        outputLocation: outputPath,
        inputProps: {
          scenes: renderRequest.scenes,
          branding: renderRequest.branding,
        },
        onProgress: ({ progress }) => {
          jobManager.updateJob(jobId, { progress: Math.round(progress * 100) });
        },
      });

      // Update job with completion info
      const downloadUrl = `${this.baseUrl}/output/${jobId}.mp4`;
      jobManager.updateJob(jobId, {
        status: 'completed',
        completedAt: new Date(),
        outputPath,
        downloadUrl,
        progress: 100,
      });

      logger.info({ msg: 'Render completed', jobId, outputPath, downloadUrl });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ msg: 'Render failed', jobId, error: errorMessage });

      jobManager.updateJob(jobId, {
        status: 'failed',
        error: errorMessage,
        completedAt: new Date(),
      });
    }
  }
}

export const renderService = new RenderService();
