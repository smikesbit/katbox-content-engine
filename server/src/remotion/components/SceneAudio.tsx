import { Audio } from 'remotion';

interface SceneAudioProps {
  voiceoverUrl: string;
}

export const SceneAudio: React.FC<SceneAudioProps> = ({ voiceoverUrl }) => {
  return <Audio src={voiceoverUrl} volume={1} />;
};
