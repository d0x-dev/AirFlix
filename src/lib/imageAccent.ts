import {cache, getColors} from 'react-native-image-colors';
import {mixHex} from '../theme/seeds';

const IMAGE_COLOR_FALLBACK = '#FFFFFF';
const accentCache = new Map<string, Promise<string>>();

export const clearImageAccentCache = (): void => {
  accentCache.clear();
};

export const selectImageAccent = (
  imageColors: Awaited<ReturnType<typeof getColors>>,
) => {
  const candidates =
    imageColors.platform === 'android'
      ? [
          imageColors.lightVibrant,
          imageColors.vibrant,
          imageColors.dominant,
          imageColors.average,
          imageColors.darkVibrant,
        ]
      : imageColors.platform === 'ios'
        ? [imageColors.primary, imageColors.secondary]
        : [imageColors.vibrant, imageColors.dominant];

  return candidates.find(
    candidate => candidate.toUpperCase() !== IMAGE_COLOR_FALLBACK.toUpperCase(),
  );
};

export const extractImageAccent = async (
  imageUri: string,
  cacheKey: string,
): Promise<string | undefined> => {
  try {
    const imageColors = await getColors(imageUri, {
      cache: true,
      fallback: IMAGE_COLOR_FALLBACK,
      key: cacheKey,
      pixelSpacing: 8,
    });
    const accent = selectImageAccent(imageColors);
    if (!accent) {
      cache.removeItem(cacheKey);
    }
    return accent;
  } catch {
    cache.removeItem(cacheKey);
    return undefined;
  }
};

export const getImageAccent = (
  imageUri: string | undefined,
  fallback: string,
): Promise<string> => {
  if (!imageUri) {
    return Promise.resolve(fallback);
  }

  const cached = accentCache.get(imageUri);
  if (cached) {
    return cached;
  }

  const accent = extractImageAccent(
    imageUri,
    `shared-image-accent-v2:${imageUri}`,
  ).then(extractedColor =>
    extractedColor ? mixHex(extractedColor, '#FFFFFF', 0.35) : fallback,
  );

  accentCache.set(imageUri, accent);
  return accent;
};
