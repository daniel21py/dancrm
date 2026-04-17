import { useEffect } from 'react'
import { RouterProvider } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Toaster } from 'sonner'
import { router } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { SdqLogo } from '@/components/sdq-logo'

export default function App() {
  const { loading, initialize } = useAuthStore()
  const { theme } = useThemeStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative">
            <SdqLogo className="h-12 w-12" />
            <motion.div
              className="absolute -inset-1 rounded-xl ring-2 ring-primary/40"
              animate={{ opacity: [0.2, 0.8, 0.2] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <div className="h-0.5 w-24 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full w-1/3 bg-primary"
              animate={{ x: ['-100%', '300%'] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            DanCRM · SDQ
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        theme={theme === 'light' ? 'light' : 'dark'}
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast:
              'border border-border bg-card/95 backdrop-blur text-foreground text-sm shadow-card-hover',
            description: 'text-muted-foreground',
          },
        }}
      />
    </>
  )
}
