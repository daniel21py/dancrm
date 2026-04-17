import { Outlet } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Sidebar } from './sidebar'
import { CommandPalette } from '@/components/command-palette'

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <motion.div
          className="mx-auto max-w-6xl px-8 py-6"
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
