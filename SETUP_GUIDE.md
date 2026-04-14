# DanCRM — Guida Setup Completa
> Segui questi step nell'ordine indicato

---

## STEP 1 — Copia i file nella repo

1. Apri la tua repo `dancrm` clonata in locale
2. Copia **tutti i file** da questa cartella (`dancrm-boilerplate/`) dentro la root della repo
3. La struttura finale deve essere:
   ```
   dancrm/
   ├── index.html
   ├── package.json
   ├── vite.config.ts
   ├── tsconfig.json
   ├── tsconfig.node.json
   ├── tailwind.config.ts
   ├── postcss.config.js
   ├── vercel.json
   ├── .gitignore
   ├── .env.example     ← committato (senza valori reali)
   └── src/
       ├── main.tsx
       ├── index.css
       ├── App.tsx
       └── lib/
           ├── supabase.ts
           └── utils.ts
   ```
4. Installa le dipendenze:
   ```bash
   npm install
   ```
5. Commit e push:
   ```bash
   git add .
   git commit -m "feat: initial DanCRM boilerplate"
   git push origin main
   ```

---

## STEP 2 — Crea il progetto Supabase

1. Vai su **https://supabase.com** → New Project
2. Impostazioni:
   - **Organization**: il tuo account
   - **Name**: `dancrm` (o `dancrm-prod`)
   - **Database Password**: scegli una password robusta (SALVALA!)
   - **Region**: `West EU (Ireland)` — il più vicino all'Italia
   - **Plan**: Free (poi upgradi se serve)
3. Attendi ~2 minuti che il progetto si avvii
4. Vai in **Project Settings → API**:
   - Copia **Project URL** → `VITE_SUPABASE_URL`
   - Copia **anon / public key** → `VITE_SUPABASE_ANON_KEY`

### Attiva Email Auth
1. **Authentication → Providers → Email**
2. Assicurati che sia **Enabled**
3. Per ora lascia "Confirm email" **disabilitato** (più comodo in sviluppo)

---

## STEP 3 — Configura Vercel

### 3a. Importa la repo GitHub

1. Vai su **https://vercel.com** → Add New Project
2. **Import Git Repository** → seleziona la repo `dancrm`
3. **Framework Preset**: seleziona **Vite**
4. **Build Command**: `npm run build` (già default)
5. **Output Directory**: `dist` (già default)

### 3b. Aggiungi le Environment Variables

Nella schermata di configurazione Vercel (o dopo in Settings → Environment Variables):

| Name | Value | Environments |
|------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Production, Preview, Development |
| `VITE_APP_NAME` | `DanCRM` | Production, Preview, Development |
| `VITE_APP_URL` | `https://dancrm.tech` | Production |

⚠️ **IMPORTANTE**: le variabili con prefisso `VITE_` sono esposte nel browser — usa SOLO la **anon key**, mai la **service role key**.

### 3c. Collega il dominio dancrm.tech

1. Vercel → Il tuo progetto → **Settings → Domains**
2. Inserisci `dancrm.tech` → Add
3. Vercel ti darà due opzioni DNS:
   - **A record**: `76.76.21.21`
   - **CNAME**: `cname.vercel-dns.com`
4. Vai nel pannello del tuo registrar (dove hai preso il dominio)
5. Aggiungi i record DNS:
   ```
   Tipo: A
   Nome: @
   Valore: 76.76.21.21
   TTL: 3600

   Tipo: CNAME
   Nome: www
   Valore: cname.vercel-dns.com
   TTL: 3600
   ```
6. Attendi 5-30 minuti per la propagazione DNS
7. Vercel assegna automaticamente certificato SSL ✅

### 3d. Deploy iniziale

Fai un trigger manuale:
1. Vercel → il tuo progetto → **Deployments** → **Redeploy** (o aspetta che si triggeri dal push)
2. Dopo il build (~1 min), vai su `https://dancrm.tech`
3. Dovresti vedere la **login page** di DanCRM ✅

---

## STEP 4 — Crea il file .env locale

Nella root della repo, crea `.env` (mai committarlo!):

```env
VITE_SUPABASE_URL=https://XXXXXXXXXXXX.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_NAME=DanCRM
VITE_APP_URL=http://localhost:3001
```

Testa in locale:
```bash
npm run dev
# Apri http://localhost:3001
```

---

## STEP 5 — Esegui le Migrations SQL su Supabase

1. Vai su **Supabase → SQL Editor**
2. Copia e incolla il contenuto di `supabase/migrations/001_schema.sql`
   (generato separatamente da DanCRM Architecture)
3. Clicca **Run**
4. Verifica in **Table Editor** che le tabelle siano state create

---

## STEP 6 — Passa a Claude Code per la build

Ora hai:
- ✅ Repo GitHub con boilerplate funzionante
- ✅ Deploy automatico su dancrm.tech
- ✅ Supabase project configurato
- ✅ Preview deploys su ogni PR

**Apri Claude Code nella cartella della repo e incolla il Context Bridge** dal documento `DanCRM_Architecture.md` (sezione 14).

Primo comando da dare a Claude Code:
> "Il boilerplate base è già nella repo. Installa shadcn/ui e TanStack Router, poi crea il sistema di auth completo (login page, register page, auth hook useTenant) seguendo il Context Bridge."

---

## CHECKLIST FINALE

- [ ] File copiati nella repo e pushati su GitHub
- [ ] `npm install` eseguito senza errori
- [ ] Progetto Supabase creato e credenziali salvate
- [ ] Environment variables aggiunte su Vercel
- [ ] Dominio dancrm.tech configurato e HTTPS attivo
- [ ] `.env` locale creato (mai su git!)
- [ ] `npm run dev` funziona su localhost:3001
- [ ] Migrations SQL eseguite su Supabase
- [ ] Pronto per Claude Code 🚀
