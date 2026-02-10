import { AbsoluteFill, OffthreadVideo } from 'remotion';
import type { Scene, RenderRequest } from '../../types/scene.js';
import { TextOverlay } from './TextOverlay.js';
import { SceneAudio } from './SceneAudio.js';

interface VideoSceneProps {
  scene: Scene;
  branding: RenderRequest['branding'];
}

export const VideoScene: React.FC<VideoSceneProps> = ({ scene, branding }) => {
  if (!scene.assets.video_url) {
    throw new Error(`Scene ${scene.scene_number} is ai-video type but missing video_url`);
  }

  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={scene.assets.video_url}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
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
