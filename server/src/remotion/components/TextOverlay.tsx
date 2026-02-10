import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

interface TextOverlayProps {
  text: string;
  fontFamily: string;
  primaryColor: string;
  secondaryColor: string;
}

export const TextOverlay: React.FC<TextOverlayProps> = ({
  text,
  fontFamily,
  primaryColor,
  secondaryColor,
}) => {
  const frame = useCurrentFrame();

  // Fade in over first 10 frames
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        padding: '40px',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          backgroundColor: `${primaryColor}dd`, // Add transparency (85% opacity)
          color: 'white',
          fontSize: '42px',
          fontFamily,
          padding: '16px 32px',
          borderRadius: '12px',
          textAlign: 'center',
          opacity,
          maxWidth: '90%',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
