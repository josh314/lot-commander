import './index.css'

import { useContext, useEffect } from 'react'
import { AuthContext } from './contexts/AuthContext'

import { AppShell } from './components/AppShell'
import { HomePage } from './features/home/HomePage'

function App() {

  const user = useContext(AuthContext)

  useEffect( () => {
    if( !user ) {
      window.location.href = '/login';
    }
  }, [user])


  return (
    <AuthContext value={user}>
      <AppShell>
        <HomePage />
      </AppShell>
    </AuthContext>
  )
}

export default App
