const jpegPrefix = 'data:image/jpeg;base64,';
const maxBannerLength = jpegPrefix.length + 4 * Math.ceil(180 * 1024 / 3);

export function prepareLegacyBanner(image: string) {
  return image.length <= maxBannerLength ? Promise.resolve(image) : prepareProfileBanner(image);
}

export async function prepareProfileBanner(input: Blob | string) {
  const source = typeof input === 'string' ? input : URL.createObjectURL(input);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > 40_000_000) {
      throw new Error('Rasm o‘lchami mos kelmadi.');
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Banner rasmini tayyorlab bo‘lmadi.');

    for (const limit of [1620, 1350, 1130, 940, 780]) {
      const scale = Math.min(1, limit / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.fillStyle = '#15162e';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const jpeg = canvas.toDataURL('image/jpeg', .84);
      if (jpeg.startsWith(jpegPrefix) && jpeg.length <= maxBannerLength) return jpeg;
    }
    throw new Error('Banner hajmini qisqartirib bo‘lmadi.');
  } finally {
    if (typeof input !== 'string') URL.revokeObjectURL(source);
  }
}
