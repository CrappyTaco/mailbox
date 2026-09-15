export function PixelCelestial({ kind }: { kind: 'sun' | 'moon' }) {
  return (
    <image
      className={kind === 'sun' ? 'sun-radiance' : undefined}
      href={`/world/${kind}.png`}
      width={32}
      height={32}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
