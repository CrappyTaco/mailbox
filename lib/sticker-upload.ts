import { MAX_STICKER_BYTES, type LetterObject } from './letter-document';

function decode(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new Error('This image could not be opened. Try a PNG, JPEG or WebP.'),
      );
    image.src = source;
  });
}
// Processing stays on this device. Only the finished, bounded PNG travels with the letter.
export async function makeSticker(file: File): Promise<LetterObject> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    throw new Error('Choose a PNG, JPEG or WebP image.');
  if (file.size > 8 * 1024 * 1024)
    throw new Error('Choose an image smaller than 8 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = await decode(url);
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth * image.naturalHeight > 25000000
    )
      throw new Error('Choose an image smaller than 25 megapixels.');
    const ratio = image.naturalWidth / image.naturalHeight;
    if (ratio > 10 || ratio < 0.1)
      throw new Error('Choose an image with a less narrow shape.');
    let asset = '',
      outWidth = 0,
      outHeight = 0;
    for (const maximum of [512, 384, 256]) {
      const scale = Math.min(
        1,
        maximum / Math.max(image.naturalWidth, image.naturalHeight),
      );
      const width = Math.max(1, Math.round(image.naturalWidth * scale)),
        height = Math.max(1, Math.round(image.naturalHeight * scale));
      const border = Math.max(4, Math.round(Math.max(width, height) / 35));
      const mask = document.createElement('canvas');
      mask.width = width;
      mask.height = height;
      const maskContext = mask.getContext('2d')!;
      maskContext.drawImage(image, 0, 0, width, height);
      maskContext.globalCompositeOperation = 'source-in';
      maskContext.fillStyle = '#fffdf7';
      maskContext.fillRect(0, 0, width, height);
      const output = document.createElement('canvas');
      output.width = width + border * 2;
      output.height = height + border * 2;
      const ctx = output.getContext('2d')!;
      // Dilate alpha around the visible silhouette. Transparent input stays transparent outside its sticker edge.
      for (let y = -border; y <= border; y++)
        for (let x = -border; x <= border; x++)
          if (x * x + y * y <= border * border)
            ctx.drawImage(mask, x + border, y + border);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, border, border, width, height);
      asset = output.toDataURL('image/png');
      outWidth = output.width;
      outHeight = output.height;
      if (asset.length <= MAX_STICKER_BYTES) break;
    }
    if (asset.length > MAX_STICKER_BYTES)
      throw new Error(
        'This image is too detailed for a small sticker. Try a simpler image.',
      );
    const size = 150 / Math.max(outWidth, outHeight);
    return {
      id: crypto.randomUUID(),
      type: 'sticker',
      x: 300,
      y: 380,
      width: +(outWidth * size).toFixed(2),
      height: +(outHeight * size).toFixed(2),
      rotation: -3,
      asset,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
