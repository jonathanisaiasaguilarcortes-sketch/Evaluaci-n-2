// Utilidades para elementos físicos del dispositivo: cámara y GPS.

export const hasCamera = () =>
  !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

export async function startCamera(videoElement) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },
    audio: false
  });
  videoElement.srcObject = stream;
  await videoElement.play();
  return stream;
}

export function stopCamera(stream) {
  if (stream) stream.getTracks().forEach((track) => track.stop());
}

// Dibuja la fuente (video o imagen) en un canvas reducido y devuelve un JPEG en base64.
// Se reduce para que quepa bien en Firebase y en IndexedDB.
export function toJpegDataUrl(source, width, height, maxSize = 640, quality = 0.7) {
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

export function captureFrame(videoElement) {
  return toJpegDataUrl(videoElement, videoElement.videoWidth, videoElement.videoHeight);
}

// Alternativa cuando no hay acceso a la cámara: elegir o tomar una foto con el selector de archivos.
export function fileToJpegDataUrl(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(toJpegDataUrl(img, img.naturalWidth, img.naturalHeight));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };
    img.src = url;
  });
}

export const hasGeolocation = () => 'geolocation' in navigator;

export function getPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
      { timeout: 10000, maximumAge: 60000 }
    );
  });
}

// Convierte coordenadas en un nombre de lugar (requiere internet; si falla, usa las coordenadas).
export async function describePosition({ lat, lng }) {
  const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&zoom=14&lat=${lat}&lon=${lng}&accept-language=es`
    );
    if (!res.ok) return fallback;
    const data = await res.json();
    const a = data.address || {};
    const place = a.city || a.town || a.village || a.suburb || a.county;
    return [place, a.state].filter(Boolean).join(', ') || fallback;
  } catch {
    return fallback;
  }
}
