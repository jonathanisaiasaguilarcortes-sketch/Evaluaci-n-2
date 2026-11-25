export default function Help() {
  return (
    <div className="help-page">
      <section className="text-center">
        <h3>¿Necesitas ayuda?</h3>
        <p>Aprende a usar UTEQGram y comparte tus momentos con tus amigos.</p>
      </section>

      <section className="help-steps">
        <h4>Cómo usar la app</h4>
        <ol>
          <li>Toca el botón <i className="material-icons">add</i> para crear una publicación.</li>
          <li>Abre la cámara y toma una foto, o elige una imagen de tu galería.</li>
          <li>Toca <strong>Usar mi ubicación</strong> para llenar el lugar con el GPS.</li>
          <li>Publica. Si no tienes internet, se guarda y se envía sola al volver la conexión.</li>
          <li>Activa las notificaciones para enterarte de las publicaciones nuevas.</li>
        </ol>
        <p>
          <strong>Instalar:</strong> en Android usa “Instalar app”; en iPhone, Compartir → “Agregar a
          inicio”.
        </p>
      </section>

    </div>
  );
}
