/**
 * Convierte una URL relativa de imagen del backend en una URL absoluta
 * @param imageUrl - URL relativa o absoluta de la imagen
 * @returns URL absoluta de la imagen
 */
export const getImageUrl = (imageUrl: string | undefined | null): string | undefined => {
  if (!imageUrl) return undefined;
  
  // Si ya es una URL absoluta (http:// o https://), devolverla tal cual
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // Obtener la URL base del backend (sin /api porque las imágenes están en la raíz)
  const backendUrl = import.meta.env.VITE_API_URL || '';
  
  // Si la URL relativa no empieza con /, agregarla
  const normalizedPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  
  // Construir la URL absoluta
  return `${backendUrl}${normalizedPath}`;
};

