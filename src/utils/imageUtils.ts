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
  
  // Obtener VITE_API_URL directamente de las variables de entorno
  // Esta es la URL base del backend (sin /api)
  let backendUrl = import.meta.env.VITE_API_URL;
  
  // Si VITE_API_URL no está definida o está vacía, intentar derivarla
  if (!backendUrl || backendUrl.trim() === '' || backendUrl === 'undefined') {
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      const currentProtocol = window.location.protocol;
      
      // Si estamos en localhost, usar localhost:3000 por defecto
      if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
        backendUrl = `${currentProtocol}//localhost:3000`;
      } else {
        // En producción, asumir que el backend está en el mismo dominio pero puerto 3000
        // IMPORTANTE: Si tu backend está en un puerto diferente, ajusta esto
        backendUrl = `${currentProtocol}//${currentHost}:3000`;
        
        // Log para debugging en desarrollo
        if (import.meta.env.DEV) {
          console.warn(
            '[getImageUrl] VITE_API_URL no está definida. Usando fallback:',
            backendUrl
          );
        }
      }
    } else {
      // Fallback: devolver la URL relativa tal cual si no podemos determinar la base
      return imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    }
  }
  
  // Asegurarse de que backendUrl no termine con /
  backendUrl = backendUrl.replace(/\/+$/, '');
  
  // Si la URL relativa no empieza con /, agregarla
  const normalizedPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  
  // Construir la URL absoluta
  const fullUrl = `${backendUrl}${normalizedPath}`;
  
  // Log para debugging en desarrollo
  if (import.meta.env.DEV) {
    console.log('[getImageUrl]', { imageUrl, backendUrl, fullUrl });
  }
  
  return fullUrl;
};


