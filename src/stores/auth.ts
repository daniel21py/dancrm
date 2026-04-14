import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Tenant, TenantMember } from '@/types/database'

interface AuthState {
  session: Session | null
  user: User | null
  member: TenantMember | null
  tenant: Tenant | null
  loading: boolean
  initialized: boolean
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  member: null,
  tenant: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return

    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      await loadTenantData(session, set)
    }

    set({ session, user: session?.user ?? null, loading: false, initialized: true })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await loadTenantData(session, set)
      } else {
        set({ session: null, user: null, member: null, tenant: null })
      }
      set({ session, user: session?.user ?? null })
    })
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, member: null, tenant: null })
  },
}))

async function loadTenantData(
  session: Session,
  set: (state: Partial<AuthState>) => void
) {
  const { data: member } = await supabase
    .from('tenant_members')
    .select('*')
    .eq('user_id', session.user.id)
    .limit(1)
    .single()

  if (member) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', member.tenant_id)
      .single()

    set({ member: member as TenantMember, tenant: tenant as Tenant | null })
  }
}
