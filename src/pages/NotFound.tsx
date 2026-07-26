import { Link } from 'react-router-dom';

/**
 * 404 Not Found page — catch-all route for unmatched paths.
 * Provides clear navigation back to home and login.
 */
const NotFound = () => {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-8 text-center">
      <span
        className="material-symbols-outlined text-8xl text-on-surface-variant mb-6"
        style={{ fontVariationSettings: "'FILL' 0" }}
        aria-hidden="true"
      >
        explore_off
      </span>
      <h1 className="text-4xl font-bold text-on-surface mb-3">
        404 — Page Not Found
      </h1>
      <p className="text-on-surface-variant mb-8 max-w-md">
        The page you're looking for doesn't exist or has been moved.
        Please check the URL or navigate back to the home page.
      </p>
      <div className="flex gap-4">
        <Link
          to="/"
          className="px-6 py-3 bg-primary-container text-on-primary-container rounded-lg hover:opacity-90 transition-opacity font-medium"
        >
          Go Home
        </Link>
        <Link
          to="/login"
          className="px-6 py-3 border border-border-strong text-on-surface rounded-lg hover:bg-surface-container-low transition-colors font-medium"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
