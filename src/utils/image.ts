export const getImageSrc = (img: string | null | undefined): string => {
  if (!img) return '';
  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:') || img.startsWith('blob:')) {
    return img;
  }
  if (img.startsWith('/assets/') || img.startsWith('/src/') || img.startsWith('/@fs') || img.startsWith('/public/')) {
    return img.replace(/^\/public/, '');
  }
  if (img.startsWith('/products/') || img.startsWith('/images/')) {
    return img;
  }
  let cleanName = img.replace(/^\/?(products\/)+/, '');
  try {
    cleanName = decodeURIComponent(cleanName);
  } catch (e) {
    // ignore decoding errors
  }
  return `/products/${encodeURIComponent(cleanName)}`;
};

export const getProductImageUrl = (product: { image?: string; imageName?: string } | null | undefined): string => {
  if (!product) return '';
  const img = product.image || product.imageName || '';
  return getImageSrc(img);
};
