import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'

import './index.css'
import { routes } from './routes'

import { useAuth } from './hooks'

const router = createBrowserRouter(routes)
const queryClient = new QueryClient()

function App() {

  const user = useAuth()

  useEffect( () => {
    if( !user ) {
      window.location.href = '/login';
    }
  }, [user])


  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

export default App
