/**
 * TypeScript types for Kie AI unified API
 *
 * Kie AI provides a unified API for multiple AI models including:
 * - kling-2.6/text-to-video (video generation)
 * - flux-2/pro-text-to-image (photo generation)
 * - elevenlabs/text-to-speech-turbo-2-5 (voiceover generation)
 */

/**
 * Model name constants for Kie AI API
 */
export const KIE_AI_MODELS = {
  VIDEO: 'kling-2.6/text-to-video',
  PHOTO: 'flux-2/pro-text-to-image',
  VOICEOVER: 'elevenlabs/text-to-speech-turbo-2-5',
} as const;

/**
 * Base request shape for creating a task
 */
export interface KieAiCreateTaskRequest {
  model: string;
  callBackUrl?: string;
  input: Record<string, unknown>;
}

/**
 * Response from createTask API
 */
export interface KieAiCreateTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

/**
 * Task state enum (unified across all models)
 */
export type KieAiTaskState = 'waiting' | 'queuing' | 'generating' | 'success' | 'fail';

/**
 * Task detail response from recordInfo API
 */
export interface KieAiTaskDetail {
  taskId: string;
  model: string;
  state: KieAiTaskState;
  param: string; // JSON string of original input params
  resultJson: string; // JSON string containing result URLs
  failCode?: string;
  failMsg?: string;
  costTime?: number;
  completeTime?: number;
  createTime?: number;
  updateTime?: number;
  progress?: number; // 0-100 (only for some models)
}

/**
 * Response from recordInfo API
 */
export interface KieAiRecordInfoResponse {
  code: number;
  message: string;
  data: KieAiTaskDetail;
}

/**
 * Parsed resultJson structure
 */
export interface KieAiResultJson {
  resultUrls: string[];
}

/**
 * Video generation input (kling-2.6/text-to-video)
 */
export interface KieAiVideoInput {
  prompt: string;
  sound?: boolean;
  aspect_ratio: string; // e.g., "16:9", "9:16", "1:1"
  duration: string; // e.g., "5", "10"
}

/**
 * Photo generation input (flux-2/pro-text-to-image)
 */
export interface KieAiPhotoInput {
  prompt: string;
  aspect_ratio: string; // e.g., "16:9", "9:16", "1:1"
  resolution: string; // e.g., "1080p", "2k", "4k"
}

/**
 * Voiceover generation input (elevenlabs/text-to-speech-turbo-2-5)
 */
export interface KieAiVoiceoverInput {
  text: string;
  voice: string; // voice ID from ElevenLabs
  stability?: number; // 0-1
  similarity_boost?: number; // 0-1
  speed?: number; // 0.5-2.0
  language_code?: string; // e.g., "en", "es", "fr"
}
