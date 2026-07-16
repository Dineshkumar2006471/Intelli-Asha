/**
 * Accessible skip-to-content link for keyboard and screen reader users.
 * Visually hidden until focused, then appears at the top of the viewport.
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none"
    >
      Skip to main content
    </a>
  );
}
