import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, ArrowRight } from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RegisterPage() {
  const { joinTenant } = useAuthStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', inviteCode: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: signUpError, data } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (!data.session) {
      setError(
        'Devi prima confermare la tua email prima di procedere. Controlla la casella di posta.'
      )
      setLoading(false)
      return
    }

    const result = await joinTenant(form.inviteCode, form.fullName)
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    navigate({ to: '/dashboard' })
  }

  const Spinner = () => (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[40%] left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-sm px-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Crea il tuo account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Usa il codice invito che hai ricevuto
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <motion.div
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              required
              placeholder="Mario Rossi"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              placeholder="mario@esempio.com"
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              placeholder="••••••••"
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inviteCode">Codice invito</Label>
            <Input
              id="inviteCode"
              value={form.inviteCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, inviteCode: e.target.value.toUpperCase() }))
              }
              required
              placeholder="es. AB12CD34"
              maxLength={8}
              className="font-mono tracking-widest"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <Spinner />
            ) : (
              <>
                Registrati
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="text-primary hover:underline">
            ← Hai già un account? Accedi
          </Link>
        </p>
        <p className="mt-4 text-center text-2xs text-muted-foreground">
          N Quadro Srl &middot; SDQ Q-Rier
        </p>
      </motion.div>
    </div>
  )
}
