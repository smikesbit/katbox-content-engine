import { z } from 'zod';

// Scene represents a single scene in the storyboard
export interface Scene {
  scene_number: number;          // 1-based scene index
  duration_seconds: number;      // duration of this scene
  visual_type: "ai-video" | "ai-photo" | "motion-graphics";
  visual_description: string;    // what the viewer sees
  narration_text: string;        // Taglish voiceover script
  onscreen_text?: string;        // optional overlay text
  assets: {
    video_url?: string;          // URL to AI-generated video (for ai-video type)
    photo_url?: string;          // URL to AI-generated photo (for ai-photo type)
    voiceover_url: string;       // URL to voiceover audio
    motion_config?: object;      // Remotion motion graphics config (for motion-graphics type)
  };
}

// RenderRequest is what POST /render receives
export interface RenderRequest {
  storyboard_id: string;
  topic_id: string;
  scenes: Scene[];               // ordered array of scenes
  branding: {
    logo_url: string;            // Katbox logo for watermark
    primary_color: string;       // hex color
    secondary_color: string;     // hex color
    font_family: string;         // font name
  };
}

// Zod schemas for runtime validation
export const sceneSchema = z.object({
  scene_number: z.number().int().positive(),
  duration_seconds: z.number().positive(),
  visual_type: z.enum(['ai-video', 'ai-photo', 'motion-graphics']),
  visual_description: z.string().min(1),
  narration_text: z.string().min(1),
  onscreen_text: z.string().optional(),
  assets: z.object({
    video_url: z.string().url().optional(),
    photo_url: z.string().url().optional(),
    voiceover_url: z.string().url(),
    motion_config: z.object({}).passthrough().optional(),
  }),
});

export const renderRequestSchema = z.object({
  storyboard_id: z.string().min(1),
  topic_id: z.string().min(1),
  scenes: z.array(sceneSchema).min(1),
  branding: z.object({
    logo_url: z.string().url(),
    primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    font_family: z.string().min(1),
  }),
});
