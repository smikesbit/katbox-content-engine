import { Composition } from 'remotion';
import { KatboxVideo } from './compositions/KatboxVideo.js';
import type { RenderRequest, Scene } from '../types/scene.js';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="KatboxVideo"
        component={KatboxVideo}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={300} // Default 10 seconds, overridden by calculateMetadata
        defaultProps={{
          storyboard_id: 'demo-001',
          topic_id: 'demo-topic',
          scenes: [
            {
              scene_number: 1,
              duration_seconds: 5,
              visual_type: 'ai-video' as const,
              visual_description: 'Sample video scene',
              narration_text: 'This is a demo narration',
              assets: {
                video_url: 'https://example.com/video.mp4',
                voiceover_url: 'https://example.com/audio.mp3',
              },
            },
            {
              scene_number: 2,
              duration_seconds: 5,
              visual_type: 'ai-photo' as const,
              visual_description: 'Sample photo scene',
              narration_text: 'This is another demo narration',
              onscreen_text: 'Sample text overlay',
              assets: {
                photo_url: 'https://example.com/photo.jpg',
                voiceover_url: 'https://example.com/audio2.mp3',
              },
            },
          ],
          branding: {
            logo_url: 'https://example.com/logo.png',
            primary_color: '#FF6B00',
            secondary_color: '#333333',
            font_family: 'Arial',
          },
        }}
        calculateMetadata={({ props }) => {
          const typedProps = props as unknown as RenderRequest;
          const totalFrames = typedProps.scenes.reduce(
            (sum: number, scene: Scene) => sum + scene.duration_seconds * 30,
            0
          );
          return {
            durationInFrames: totalFrames,
            fps: 30,
            width: 1080,
            height: 1920,
          };
        }}
      />
    </>
  );
};
