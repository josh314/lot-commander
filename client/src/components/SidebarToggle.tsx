import { ChevronIcon } from './icons'
import { HEADER_HEIGHT, SIDEBAR_WIDTH } from './Sidebar'

export const TAB_SIZE = 28

export function SidebarToggle({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      style={{
        left: isOpen ? SIDEBAR_WIDTH - TAB_SIZE / 2 : 8,
        top: HEADER_HEIGHT,
      }}
      className="fixed z-10 flex h-8 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-muted hover:text-ink"
    >
      <ChevronIcon direction={isOpen ? 'left' : 'right'} />
    </button>
  )
}
