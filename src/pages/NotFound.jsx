import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page-content text-center">
      <h5 className="mdl-color-text--primary">Esta página no existe</h5>
      <p>
        Vuelve al <Link to="/">feed</Link>.
      </p>
    </div>
  );
}
