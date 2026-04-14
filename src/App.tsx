import { useEffect } from 'react'
import { RouterProvider } from '@tanstack/react-router'
import { router } from '@/router'
import { useAuthStore } from '@/stores/auth'

export default function App() {
  const { loading, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Caricamento DanCRM...</p>
        </div>
      </div>
    )
  }

  return <RouterProvider router={router} />
}
