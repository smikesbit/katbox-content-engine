import { Series, AbsoluteFill } from 'remotion';
import type { RenderRequest } from '../../types/scene.js';
import { VideoScene } from '../components/VideoScene.js';
import { PhotoScene } from '../components/PhotoScene.js';
import { MotionGraphicsScene } from '../components/MotionGraphicsScene.js';
import { Watermark } from '../components/Watermark.js';

export const KatboxVideo: React.FC<Record<string, unknown>> = (props) => {
  const { scenes, branding } = props as unknown as RenderRequest;
  return (
    <AbsoluteFill>
      <Series>
        {scenes.map((scene) => {
          const durationInFrames = scene.duration_seconds * 30;

          return (
            <Series.Sequence key={scene.scene_number} durationInFrames={durationInFrames}>
              {scene.visual_type === 'ai-video' && (
                <VideoScene scene={scene} branding={branding} />
              )}
              {scene.visual_type === 'ai-photo' && (
                <PhotoScene scene={scene} branding={branding} />
              )}
              {scene.visual_type === 'motion-graphics' && (
                <MotionGraphicsScene scene={scene} branding={branding} />
              )}
            </Series.Sequence>
          );
        })}
      </Series>
      {/* Persistent watermark overlay on top of all scenes */}
      <Watermark logoUrl={branding.logo_url} />
    </AbsoluteFill>
  );
};
