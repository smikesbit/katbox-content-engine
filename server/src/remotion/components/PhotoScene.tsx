import { AbsoluteFill, Img, useCurrentFrame, interpolate } from 'remotion';
import type { Scene, RenderRequest } from '../../types/scene.js';
import { TextOverlay } from './TextOverlay.js';
import { SceneAudio } from './SceneAudio.js';

interface PhotoSceneProps {
  scene: Scene;
  branding: RenderRequest['branding'];
}

export const PhotoScene: React.FC<PhotoSceneProps> = ({ scene, branding }) => {
  if (!scene.assets.photo_url) {
    throw new Error(`Scene ${scene.scene_number} is ai-photo type but missing photo_url`);
  }

  const frame = useCurrentFrame();
  const durationInFrames = scene.duration_seconds * 30;

  // Ken Burns effect: slowly zoom from 1.0 to 1.1 over scene duration
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        <Img
          src={scene.assets.photo_url}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${scale})`,
          }}
        />
      </AbsoluteFill>
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
