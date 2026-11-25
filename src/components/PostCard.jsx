import { DEFAULT_IMAGE_URL } from '../lib/config.js';

export default function PostCard({ post }) {
  const image = post.image || DEFAULT_IMAGE_URL;

  return (
    <article className="shared-moment-card mdl-card mdl-shadow--2dp">
      <div className="mdl-card__title" style={{ backgroundImage: `url("${image}")` }}>
        <h2 className="mdl-card__title-text">{post.title}</h2>
      </div>
      <div className="mdl-card__supporting-text">
        {post.location}
        {post.pending && (
          <span className="pending-badge">
            <i className="material-icons">schedule</i> Pendiente de enviar
          </span>
        )}
      </div>
    </article>
  );
}
