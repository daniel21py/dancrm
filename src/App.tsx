import { useEffect } from 'react'
import { RouterProvider } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { Toaster } from 'sonner'
import { router } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

export default function App() {
  const { loading, initialize } = useAuthStore()
  const { theme } = useThemeStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full bg-primary"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        theme={theme}
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: 'border border-border bg-card text-foreground text-sm',
            description: 'text-muted-foreground',
          },
        }}
      />
    </>
  )
}
