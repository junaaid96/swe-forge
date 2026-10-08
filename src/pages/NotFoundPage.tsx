import { Link } from 'react-router-dom';

export function NotFoundPage({ message = "We couldn't find that page." }: { message?: string }) {
  return (
    <div className="empty-state">
      <p className="eyebrow">404</p>
      <h1>Nothing here</h1>
      <p className="muted">{message} Try search (⌘K) or head back home.</p>
      <Link className="btn btn-primary" to="/">
        Back home
      </Link>
    </div>
  );
}

export default NotFoundPage;
