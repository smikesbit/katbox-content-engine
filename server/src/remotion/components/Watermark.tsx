import { AbsoluteFill, Img } from 'remotion';

interface WatermarkProps {
  logoUrl: string;
}

export const Watermark: React.FC<WatermarkProps> = ({ logoUrl }) => {
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        padding: '24px',
        pointerEvents: 'none',
      }}
    >
      <Img
        src={logoUrl}
        style={{
          width: '120px',
          height: '120px',
          opacity: 0.7,
        }}
      />
    </AbsoluteFill>
  );
};
