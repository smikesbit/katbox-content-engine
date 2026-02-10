import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import type { Scene, RenderRequest } from '../../types/scene.js';
import { TextOverlay } from './TextOverlay.js';
import { SceneAudio } from './SceneAudio.js';

interface MotionGraphicsSceneProps {
  scene: Scene;
  branding: RenderRequest['branding'];
}

export const MotionGraphicsScene: React.FC<MotionGraphicsSceneProps> = ({
  scene,
  branding,
}) => {
  const frame = useCurrentFrame();

  // Fade in opacity from 0 to 1 over first 15 frames
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      {/* Branded background */}
      <AbsoluteFill style={{ backgroundColor: branding.primary_color }} />

      {/* Centered narration text with fade-in */}
      <AbsoluteFill
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px',
        }}
      >
        <div
          style={{
            fontSize: '64px',
            fontFamily: branding.font_family,
            color: branding.secondary_color,
            textAlign: 'center',
            lineHeight: 1.4,
            opacity,
          }}
        >
          {scene.narration_text}
        </div>
      </AbsoluteFill>

      {/* Optional onscreen text overlay (separate from narration display) */}
      {scene.onscreen_text && (
        <TextOverlay
          text={scene.onscreen_text}
          fontFamily={branding.font_family}
          primaryColor={branding.primary_color}
          secondaryColor={branding.secondary_color}
        />
      )}
      <SceneAudio voiceoverUrl={scene.assets.voiceover_url} />
    </AbsoluteFill>
  );
};
