import './index.css'
import { routes } from './routes'
import { useContext, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from './contexts/AuthContext'

import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'

const router = createBrowserRouter(routes)
const queryClient = new QueryClient()

function App() {

  const user = useContext(AuthContext)

  useEffect( () => {
    if( !user ) {
      window.location.href = '/login';
    }
  }, [user])


  return (
    <AuthContext value={user}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AuthContext>
  )
}

export default App
