import { Navbar } from './Navbar'
interface AppShellProps {
  children: React.ReactNode
}

export function AppShell( { children }: AppShellProps ) {

  return (
    <div>
      <Navbar />
      { children }
    </div>
  )
}