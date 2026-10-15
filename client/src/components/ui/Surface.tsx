export function Surface({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface px-4 py-4 rounded-lg shadow-xl w-fit">
      {children}
    </div>
  )
}