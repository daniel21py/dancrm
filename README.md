# DanCRM

CRM standalone per **N Quadro Srl** / brand **SDQ Sameday Q-Rier**.

Gestisce il ciclo di vita del cliente: dal prospect alla gestione operativa, con pipeline vendita, attivita, task e integrazione DanTMS.

## Stack

- **Frontend:** React 19 + TypeScript + Vite + TailwindCSS
- **UI:** shadcn/ui + Lucide icons + Recharts
- **State:** TanStack Query + Zustand
- **Forms:** react-hook-form + Zod
- **Drag & Drop:** @dnd-kit (Kanban pipeline)
- **Backend:** Supabase (PostgreSQL + Auth + RLS + Realtime)
- **Deploy:** Vercel (auto-deploy da main)
- **Dominio:** dancrm.tech

## Setup dev locale

```bash
# Clona
git clone https://github.com/daniel21py/dancrm.git
cd dancrm

# Installa dipendenze
npm install

# Configura environment
cp .env.example .env
# Modifica .env con le credenziali Supabase

# Avvia dev server
npm run dev
# http://localhost:3001
```

## Variabili ambiente

| Variabile | Descrizione |
|-----------|-------------|
| `VITE_SUPABASE_URL` | URL progetto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon/public key Supabase |
| `VITE_APP_NAME` | Nome app (default: DanCRM) |
| `VITE_APP_URL` | URL produzione |

## Script

| Comando | Descrizione |
|---------|-------------|
| `npm run dev` | Dev server (porta 3001) |
| `npm run build` | Build produzione (tsc + vite) |
| `npm run preview` | Preview build locale |
| `npm run lint` | ESLint |

## Database

Le migration SQL sono in `supabase/migrations/`. Eseguirle nel SQL Editor di Supabase.

Tabelle principali: `tenants`, `tenant_members`, `companies`, `contacts`, `deals`, `pipeline_stages`, `activities`, `tasks`, `tags`.

Multi-tenant con RLS: ogni tabella ha `tenant_id` e policy di isolamento.

## Struttura

```
dancrm/
├── public/            # Asset statici (favicon)
├── src/
│   ├── App.tsx        # Root component + auth
│   ├── main.tsx       # Entry point + QueryClient
│   ├── index.css      # Tailwind + CSS variables
│   └── lib/
│       ├── supabase.ts  # Client Supabase
│       └── utils.ts     # Utility (cn, formatDate, formatCurrency)
├── supabase/
│   └── migrations/    # Schema SQL
├── vercel.json        # SPA rewrites + security headers
└── package.json
```
