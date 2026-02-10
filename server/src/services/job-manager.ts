import { logger } from '../logger.js';

export type RenderJobStatus = 'queued' | 'bundling' | 'rendering' | 'completed' | 'failed';

export interface RenderJob {
  id: string;
  storyboardId: string;
  status: RenderJobStatus;
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  outputPath?: string;
  downloadUrl?: string;
  error?: string;
  sceneCount: number;
  totalDurationSeconds: number;
}

export class JobManager {
  private jobs: Map<string, RenderJob>;

  constructor() {
    this.jobs = new Map();
  }

  createJob(storyboardId: string, sceneCount: number, totalDuration: number): RenderJob {
    const id = crypto.randomUUID();
    const job: RenderJob = {
      id,
      storyboardId,
      status: 'queued',
      progress: 0,
      createdAt: new Date(),
      sceneCount,
      totalDurationSeconds: totalDuration,
    };

    this.jobs.set(id, job);
    logger.info({ msg: 'Job created', jobId: id, storyboardId });
    return job;
  }

  getJob(jobId: string): RenderJob | undefined {
    return this.jobs.get(jobId);
  }

  updateJob(jobId: string, updates: Partial<RenderJob>): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      logger.warn({ msg: 'Attempted to update non-existent job', jobId });
      return;
    }

    Object.assign(job, updates);
    this.jobs.set(jobId, job);
  }

  listJobs(): RenderJob[] {
    return Array.from(this.jobs.values());
  }

  cleanupOldJobs(maxAgeMs: number): number {
    const cutoffTime = Date.now() - maxAgeMs;
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

export const jobManager = new JobManager();
