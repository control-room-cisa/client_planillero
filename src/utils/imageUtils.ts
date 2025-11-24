import { API_CONFIG } from "../config/api";

/**
 * Convierte una URL relativa de imagen del backend en una URL absoluta
 * Usa la misma configuración que API_CONFIG para garantizar consistencia
 * @param imageUrl - URL relativa o absoluta de la imagen
 * @returns URL absoluta de la imagen
 */
export const getImageUrl = (
  imageUrl: string | undefined | null
): string | undefined => {
  if (!imageUrl) return undefined;

  // Si ya es una URL absoluta (http:// o https://), devolverla tal cual
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  // Usar API_CONFIG.BASE_URL que ya funciona correctamente para los endpoints
  // Remover '/api' del final para obtener la URL base del servidor
  // Ejemplo: 'http://planillero.arrayanhn.com:3000/api' -> 'http://planillero.arrayanhn.com:3000'
  let backendUrl = API_CONFIG.BASE_URL.replace(/\/api\/?$/, "");

  // Si después de remover /api queda vacío o no es una URL absoluta,
  // usar VITE_API_URL directamente como fallback
  if (
    !backendUrl ||
    (!backendUrl.startsWith("http://") && !backendUrl.startsWith("https://"))
  ) {
    // Intentar usar VITE_API_URL directamente
    const viteApiUrl = import.meta.env.VITE_API_URL;
    if (
      viteApiUrl &&
      (viteApiUrl.startsWith("http://") || viteApiUrl.startsWith("https://"))
    ) {
      backendUrl = viteApiUrl;
    } else {
      // Último recurso: usar window.location para construir la URL del backend
      if (typeof window !== "undefined") {
        const currentHost = window.location.hostname;
        const currentProtocol = window.location.protocol;

        // Si estamos en localhost, usar localhost:3000 por defecto
        if (currentHost === "localhost" || currentHost === "127.0.0.1") {
          backendUrl = `${currentProtocol}//localhost:3000`;
        } else {
          // En producción, asumir que el backend está en el mismo dominio pero puerto 3000
          backendUrl = `${currentProtocol}//${currentHost}:3000`;
        }
      } else {
        // Fallback: devolver la URL relativa tal cual si no podemos determinar la base
        return imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
      }
    }
  }

  // Asegurarse de que backendUrl no termine con /
  backendUrl = backendUrl.replace(/\/+$/, "");

  // Si la URL relativa no empieza con /, agregarla
  const normalizedPath = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;

  // Construir la URL absoluta
  const fullUrl = `${backendUrl}${normalizedPath}`;

  // Debug temporal - revisar en consola del navegador qué valores se están usando
  console.log("[getImageUrl]", {
    "API_CONFIG.BASE_URL": API_CONFIG.BASE_URL,
    "backendUrl final": backendUrl,
    VITE_API_URL: import.meta.env.VITE_API_URL,
    imageUrl: imageUrl,
    "fullUrl generada": fullUrl,
  });

  return fullUrl;
};
