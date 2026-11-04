export function BackButton({ onClick }: { onClick: () => void }) {
  return <button type="button" className="text-button back-button" onClick={onClick} aria-label="Back" title="Back">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M19 12H5m7-7-7 7 7 7" />
    </svg>
  </button>;
}
