export function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ transform: direction === 'right' ? 'scaleX(-1)' : undefined }}
    >
      <path d="M10 3 5 8l5 5" />
    </svg>
  )
}
