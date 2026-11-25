import { useEffect, useRef, useState } from 'react';
import {
  captureFrame,
  describePosition,
  fileToJpegDataUrl,
  getPosition,
  hasCamera,
  hasGeolocation,
  startCamera,
  stopCamera
} from '../lib/media.js';
import { useToast } from './Toast.jsx';

export default function CreatePost({ open, onClose, onSubmit }) {
  const showToast = useToast();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState(null);
  const [image, setImage] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [locating, setLocating] = useState(false);

  // Apagar la cámara al cerrar el formulario o desmontar el componente.
  useEffect(() => {
    if (!open) turnOffCamera();
    return turnOffCamera;
  }, [open]);

  function turnOffCamera() {
    stopCamera(streamRef.current);
    streamRef.current = null;
    setCameraOn(false);
  }

  async function turnOnCamera() {
    try {
      setImage(null);
      setCameraOn(true);
      streamRef.current = await startCamera(videoRef.current);
    } catch (err) {
      console.error(err);
      setCameraOn(false);
      showToast('No se pudo abrir la cámara. Puedes elegir una foto.');
    }
  }

  function takePhoto() {
    setImage(captureFrame(videoRef.current));
    turnOffCamera();
  }

  async function pickFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      setImage(await fileToJpegDataUrl(file));
    } catch {
      showToast('No se pudo leer la imagen');
    }
  }

  async function locate() {
    setLocating(true);
    try {
      const position = await getPosition();
      setCoords(position);
      setLocation(await describePosition(position));
    } catch (err) {
      console.error(err);
      showToast('No se pudo obtener la ubicación. Escríbela a mano.');
    } finally {
      setLocating(false);
    }
  }

  function reset() {
    setTitle('');
    setLocation('');
    setCoords(null);
    setImage(null);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!title.trim() || !location.trim()) {
      showToast('Escribe un título y una ubicación');
      return;
    }
    onSubmit({ title: title.trim(), location: location.trim(), image, coords });
    reset();
    onClose();
  }

  return (
    <section className={'create-post' + (open ? ' is-open' : '')} aria-hidden={!open}>
      <form onSubmit={handleSubmit}>
        <div className="capture">
          <video ref={videoRef} className={cameraOn ? '' : 'hidden'} playsInline muted />
          {image && !cameraOn && <img src={image} alt="Vista previa" className="preview" />}

          <div className="capture-actions">
            {hasCamera() && !cameraOn && (
              <button type="button" className="mdl-button mdl-button--raised" onClick={turnOnCamera}>
                <i className="material-icons">photo_camera</i> {image ? 'Otra foto' : 'Abrir cámara'}
              </button>
            )}
            {cameraOn && (
              <button type="button" className="mdl-button mdl-button--raised mdl-button--colored" onClick={takePhoto}>
                <i className="material-icons">camera</i> Tomar foto
              </button>
            )}
            <label className="mdl-button mdl-button--raised file-button">
              <i className="material-icons">image</i> Elegir imagen
              <input type="file" accept="image/*" capture="environment" onChange={pickFile} />
            </label>
          </div>
        </div>

        <label className="field">
          <span>Título</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
        </label>

        <label className="field">
          <span>Ubicación</span>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} />
        </label>

        {hasGeolocation() && (
          <button type="button" className="mdl-button" onClick={locate} disabled={locating}>
            <i className="material-icons">my_location</i> {locating ? 'Buscando...' : 'Usar mi ubicación'}
          </button>
        )}
        {coords && (
          <p className="coords">
            GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </p>
        )}

        <div className="form-actions">
          <button type="submit" className="mdl-button mdl-button--raised mdl-button--colored mdl-button--accent">
            Publicar
          </button>
        </div>
      </form>

      <button type="button" className="mdl-button mdl-button--fab close-button" onClick={onClose} aria-label="Cerrar">
        <i className="material-icons">close</i>
      </button>
    </section>
  );
}
