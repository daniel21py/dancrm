import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'light'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },
      toggle: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        get().setTheme(next)
      },
    }),
    { name: 'dancrm-theme' }
  )
)

export function initTheme() {
  const stored = localStorage.getItem('dancrm-theme')
  try {
    const parsed = stored ? JSON.parse(stored) : null
    const theme: Theme = parsed?.state?.theme ?? 'dark'
    applyTheme(theme)
  } catch {
    applyTheme('dark')
  }
}
