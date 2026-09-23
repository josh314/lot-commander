import './index.css'
import { routes } from './routes'
import { useContext, useEffect } from 'react'
import { AuthContext } from './contexts/AuthContext'

import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'

const router = createBrowserRouter(routes)

function App() {

  const user = useContext(AuthContext)

  useEffect( () => {
    if( !user ) {
      window.location.href = '/login';
    }
  }, [user])


  return (
    <AuthContext value={user}>
      <RouterProvider router={router} />
    </AuthContext>
  )
}

export default App
