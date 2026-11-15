import Link from 'next/link';
export function Logo({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="#5368d9"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="9" height="3.5" rx="1.75" />
      <rect x="6" y="8.25" width="10" height="3.5" rx="1.75" />
      <rect x="10" y="13.5" width="8" height="3.5" rx="1.75" />
    </svg>
  );
}
export function Wordmark() {
  return (
    <Link className="wordmark" href="/" aria-label="Ganttaro home">
      <Logo />
      ganttaro
    </Link>
  );
}
export function Loading({ label }: { label: string }) {
  return (
    <main className="loading-page" aria-busy="true">
      <Logo size={28} className="loading-logo" />
      <p>{label}</p>
    </main>
  );
}
