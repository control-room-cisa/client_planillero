import { API_CONFIG } from "../config/api";

/**
 * Convierte una URL relativa de imagen/CV del backend en una URL absoluta.
 * Para /uploads agrega ?token= del JWT (las etiquetas <img>/<a> no envían Authorization).
 */
export const getImageUrl = (
  imageUrl: string | undefined | null
): string | undefined => {
  if (!imageUrl) return undefined;

  // Si ya es una URL absoluta (http:// o https://), devolverla tal cual
  // (si apunta a /uploads sin token, appendTokenIfUploads la refuerza abajo)
  let resolved = imageUrl;

  if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
    // Usar API_CONFIG.BASE_URL que ya funciona correctamente para los endpoints
    // Remover '/api' del final para obtener la URL base del servidor
    let backendUrl = API_CONFIG.BASE_URL.replace(/\/api\/?$/, "");

    if (
      !backendUrl ||
      (!backendUrl.startsWith("http://") && !backendUrl.startsWith("https://"))
    ) {
      const viteApiUrl = import.meta.env.VITE_API_URL;
      if (
        viteApiUrl &&
        (viteApiUrl.startsWith("http://") || viteApiUrl.startsWith("https://"))
      ) {
        backendUrl = viteApiUrl;
      } else if (typeof window !== "undefined") {
        const currentHost = window.location.hostname;
        const currentProtocol = window.location.protocol;
        if (currentHost === "localhost" || currentHost === "127.0.0.1") {
          backendUrl = `${currentProtocol}//localhost:3000`;
        } else {
          backendUrl = `${currentProtocol}//${currentHost}:3000`;
        }
      } else {
        resolved = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
        return appendUploadToken(resolved);
      }
    }

    backendUrl = backendUrl.replace(/\/+$/, "");
    const normalizedPath = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
    resolved = `${backendUrl}${normalizedPath}`;
  }

  return appendUploadToken(resolved);
};

function appendUploadToken(url: string): string {
  const isUpload =
    url.includes("/uploads/") ||
    url.endsWith("/uploads") ||
    /\/uploads(\?|$)/.test(url);
  if (!isUpload) return url;

  const token =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("authToken")
      : null;
  if (!token) return url;

  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : undefined);
    if (!u.searchParams.has("token")) {
      u.searchParams.set("token", token);
    }
    return u.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}token=${encodeURIComponent(token)}`;
  }
}
