export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
    </header>
  )
}

export function SectionHeader({ title }: { title: string }) {
  return (
    <header className="mb-2">
      <h2 className="text-xl font-semibold">{title}</h2>
    </header>
  )
}

export function SubsectionHeader({ title }: { title: string }) {
  return (
    <header className="mb-1">
      <h3 className="text-lg font-medium">{title}</h3>
    </header>
  )
}