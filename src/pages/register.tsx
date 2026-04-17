import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SdqLogo } from '@/components/sdq-logo'

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-30%] h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[-25%] right-[-10%] h-[420px] w-[420px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage:
            'radial-gradient(ellipse at center, black 0%, transparent 70%)',
        }}
      />

      <motion.div
        className="relative z-10 w-full max-w-sm px-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <div className="mb-10 flex flex-col items-center">
          <SdqLogo full className="mb-5 h-24 w-24 shadow-lime-glow" />
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Crea il tuo account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Usa il codice invito che hai ricevuto
          </p>
        </div>

        <form onSubmit={handleRegister} className="surface-glass space-y-4 rounded-2xl border border-border/60 p-5">
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
        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          N Quadro Srl · SDQ Sameday Q-Rier
        </p>
      </motion.div>
    </div>
  )
}
