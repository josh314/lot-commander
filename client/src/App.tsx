import './index.css'

import { AppShell } from './components/AppShell'
import { HomePage } from './features/home/HomePage'

function App() {

  return (
    <>
      <AppShell>
        <HomePage />
      </AppShell>
    </>
  )
}

export default App
