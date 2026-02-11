/**
 * Kie AI HTTP Client Service
 *
 * Provides typed methods for interacting with the Kie AI unified API.
 * Handles task creation, polling, and result retrieval for:
 * - Video generation (kling-2.6/text-to-video)
 * - Photo generation (flux-2/pro-text-to-image)
 * - Voiceover generation (elevenlabs/text-to-speech-turbo-2-5)
 */

import { logger } from '../logger.js';
import { pollUntilDone } from '../utils/async-poller.js';
import type {
  KieAiCreateTaskRequest,
  KieAiCreateTaskResponse,
  KieAiTaskDetail,
  KieAiRecordInfoResponse,
  KieAiResultJson,
  KieAiVideoInput,
  KieAiPhotoInput,
  KieAiVoiceoverInput,
} from '../types/kie-ai.js';
import { KIE_AI_MODELS } from '../types/kie-ai.js';

export class KieAiClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.kie.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    if (!apiKey) {
      logger.warn({ msg: 'KIE_AI_API_KEY not set - asset generation will not work' });
    }
  }

  /**
   * Create a new generation task
   */
  private async createTask(request: KieAiCreateTaskRequest): Promise<string> {
    const url = `${this.baseUrl}/jobs/createTask`;

    logger.info({
      msg: 'Creating Kie AI task',
      model: request.model,
      input: request.input,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({
        msg: 'Kie AI createTask request failed',
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(
        `Kie AI createTask failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = (await response.json()) as KieAiCreateTaskResponse;

    if (data.code !== 200) {
      logger.error({
        msg: 'Kie AI createTask returned error code',
        code: data.code,
        message: data.msg,
      });
      throw new Error(`Kie AI createTask error: ${data.msg} (code: ${data.code})`);
    }

    logger.info({
      msg: 'Kie AI task created',
      taskId: data.data.taskId,
      model: request.model,
    });

    return data.data.taskId;
  }

  /**
   * Get task details and status
   */
  private async getTaskDetail(taskId: string): Promise<KieAiTaskDetail> {
    const url = `${this.baseUrl}/jobs/recordInfo?taskId=${taskId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({
        msg: 'Kie AI recordInfo request failed',
        taskId,
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(
        `Kie AI recordInfo failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = (await response.json()) as KieAiRecordInfoResponse;

    if (data.code !== 200) {
      logger.error({
        msg: 'Kie AI recordInfo returned error code',
        code: data.code,
        message: data.message,
      });
      throw new Error(`Kie AI recordInfo error: ${data.message} (code: ${data.code})`);
    }

    return data.data;
  }

  /**
   * Wait for a task to complete using exponential backoff polling
   */
  private async waitForTask(taskId: string, jobType: string): Promise<string[]> {
    const result = await pollUntilDone<string[]>(
      async () => {
        const detail = await this.getTaskDetail(taskId);

        logger.info({
          msg: 'Kie AI task status',
          taskId,
          state: detail.state,
          progress: detail.progress,
        });

        if (detail.state === 'success') {
          // Parse resultJson to extract URLs
          const resultJson: KieAiResultJson = JSON.parse(detail.resultJson);
          return {
            done: true,
            result: resultJson.resultUrls,
          };
        }

        if (detail.state === 'fail') {
          const errorMsg = detail.failMsg || 'Generation failed';
          return {
            done: false,
            error: errorMsg,
          };
        }

        // Still processing (waiting, queuing, or generating)
        return {
          done: false,
        };
      },
      {
        jobId: taskId,
        jobType,
        logger,
      }
    );

    return result;
  }

  /**
   * Generate a video using kling-2.6/text-to-video
   */
  public async generateVideo(input: KieAiVideoInput): Promise<string[]> {
    const taskId = await this.createTask({
      model: KIE_AI_MODELS.VIDEO,
      input: { ...input },
    });

    return this.waitForTask(taskId, 'video-generation');
  }

  /**
   * Generate a photo using flux-2/pro-text-to-image
   */
  public async generatePhoto(input: KieAiPhotoInput): Promise<string[]> {
    const taskId = await this.createTask({
      model: KIE_AI_MODELS.PHOTO,
      input: { ...input },
    });

    return this.waitForTask(taskId, 'photo-generation');
  }

  /**
   * Generate a voiceover using elevenlabs/text-to-speech-turbo-2-5
   */
  public async generateVoiceover(input: KieAiVoiceoverInput): Promise<string[]> {
    const taskId = await this.createTask({
      model: KIE_AI_MODELS.VOICEOVER,
      input: { ...input },
    });

    return this.waitForTask(taskId, 'voiceover-generation');
  }
}

/**
 * Singleton instance initialized with environment variable
 */
export const kieAiClient = new KieAiClient(process.env.KIE_AI_API_KEY || '');
