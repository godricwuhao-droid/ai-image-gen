export const getImageUrl = (endpoint: string): string => {
  return `/assets/images/${endpoint}`;
};

export const getLogoUrl = (): string => {
  return getImageUrl('logo.png');
};

export const getFaviconUrl = (): string => {
  return getImageUrl('favicon.png');
};
