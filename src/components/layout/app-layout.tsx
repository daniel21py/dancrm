import { Outlet } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Sidebar } from './sidebar'
import { CommandPalette } from '@/components/command-palette'

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-thin pt-12 lg:pt-0">
        <motion.div
          className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>
      <CommandPalette />
    </div>
  )
}
