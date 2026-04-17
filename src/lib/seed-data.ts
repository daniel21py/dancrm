import { supabase } from '@/lib/supabase'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function dateAgo(n: number): string {
  return daysAgo(n).split('T')[0]
}

export async function seedDemoData(tenantId: string) {
  // Ensure pipeline stages exist
  let { data: existingStages } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('position')

  if (!existingStages || existingStages.length === 0) {
    await supabase.from('pipeline_stages').insert([
      { tenant_id: tenantId, name: 'Primo Contatto', color: '#3B82F6', position: 0, is_won: false, is_lost: false },
      { tenant_id: tenantId, name: 'Qualificazione', color: '#8B5CF6', position: 1, is_won: false, is_lost: false },
      { tenant_id: tenantId, name: 'Proposta', color: '#F59E0B', position: 2, is_won: false, is_lost: false },
      { tenant_id: tenantId, name: 'Negoziazione', color: '#EF4444', position: 3, is_won: false, is_lost: false },
      { tenant_id: tenantId, name: 'Chiuso Vinto', color: '#10B981', position: 4, is_won: true, is_lost: false },
      { tenant_id: tenantId, name: 'Chiuso Perso', color: '#6B7280', position: 5, is_won: false, is_lost: true },
    ])
    const { data } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('position')
    existingStages = data ?? []
  }

  const stageMap: Record<string, string> = {}
  for (const s of existingStages) {
    stageMap[s.name] = s.id
  }

  // Companies
  const { data: companies, error: compErr } = await supabase
    .from('companies')
    .insert([
      {
        tenant_id: tenantId,
        name: 'Trasporti Veloci SpA',
        type: 'cliente',
        status: 'active',
        sector: 'Trasporti e Logistica',
        city: 'Milano',
        province: 'MI',
        phone: '+39 02 1234567',
        email: 'info@trasportivelocispa.it',
        website: 'https://trasportivelocispa.it',
        employee_count: 85,
        annual_revenue: 4200000,
        notes: 'Cliente storico, contratto triennale in scadenza a dicembre. Alto potenziale di upselling sui servizi di ultimo miglio.',
      },
      {
        tenant_id: tenantId,
        name: 'Logistica Express Srl',
        type: 'prospect',
        status: 'lead',
        sector: 'Corriere Espresso',
        city: 'Roma',
        province: 'RM',
        phone: '+39 06 9876543',
        email: 'commerciale@logisticaexpress.it',
        employee_count: 42,
        annual_revenue: 1800000,
        notes: 'Interessati ai nostri servizi di tracking avanzato. Hanno un contratto con un competitor in scadenza a giugno.',
      },
      {
        tenant_id: tenantId,
        name: 'Global Freight & Co',
        type: 'prospect',
        status: 'prospect',
        sector: 'Spedizioni Internazionali',
        city: 'Torino',
        province: 'TO',
        phone: '+39 011 5554433',
        email: 'info@globalfreight.it',
        website: 'https://globalfreight.it',
        employee_count: 120,
        annual_revenue: 7500000,
        notes: 'Multinazionale con forti volumi import/export. Interessati a soluzioni di groupage Europa.',
      },
      {
        tenant_id: tenantId,
        name: 'Adriatico Spedizioni',
        type: 'cliente',
        status: 'active',
        sector: 'Spedizioni Maritime',
        city: 'Bari',
        province: 'BA',
        phone: '+39 080 3214567',
        email: 'info@adriaticospedizioni.it',
        employee_count: 28,
        annual_revenue: 950000,
        notes: 'Specializzati in traffici Adriatico e Balcani. Ottima collaborazione, sempre puntuali nei pagamenti.',
      },
      {
        tenant_id: tenantId,
        name: 'Nord Ovest Corrieri',
        type: 'prospect',
        status: 'lead',
        sector: 'Distribuzione Locale',
        city: 'Genova',
        province: 'GE',
        phone: '+39 010 7654321',
        email: 'direzione@nordovestcorrieri.it',
        employee_count: 55,
        annual_revenue: 2100000,
      },
    ])
    .select()

  if (compErr || !companies) throw new Error('Errore inserimento aziende: ' + compErr?.message)

  const [tv, le, gf, as_, noc] = companies

  // Contacts
  const { data: contacts, error: conErr } = await supabase
    .from('contacts')
    .insert([
      {
        tenant_id: tenantId,
        company_id: tv.id,
        first_name: 'Marco',
        last_name: 'Rossi',
        role: 'decisore',
        job_title: 'CEO',
        email: 'm.rossi@trasportivelocispa.it',
        phone: '+39 02 1234567',
        mobile: '+39 335 1234567',
        linkedin_url: 'https://linkedin.com/in/marcorossi',
        is_primary: true,
      },
      {
        tenant_id: tenantId,
        company_id: tv.id,
        first_name: 'Laura',
        last_name: 'Bianchi',
        role: 'operativo',
        job_title: 'Responsabile Logistica',
        email: 'l.bianchi@trasportivelocispa.it',
        mobile: '+39 347 9876543',
        is_primary: false,
      },
      {
        tenant_id: tenantId,
        company_id: le.id,
        first_name: 'Giuseppe',
        last_name: 'Ferrari',
        role: 'decisore',
        job_title: 'Direttore Commerciale',
        email: 'g.ferrari@logisticaexpress.it',
        mobile: '+39 328 5556677',
        is_primary: true,
      },
      {
        tenant_id: tenantId,
        company_id: le.id,
        first_name: 'Davide',
        last_name: 'Ricci',
        role: 'operativo',
        job_title: 'Responsabile Operazioni',
        email: 'd.ricci@logisticaexpress.it',
        is_primary: false,
      },
      {
        tenant_id: tenantId,
        company_id: gf.id,
        first_name: 'Roberto',
        last_name: 'Mancini',
        role: 'decisore',
        job_title: 'Managing Director',
        email: 'r.mancini@globalfreight.it',
        mobile: '+39 333 1122334',
        linkedin_url: 'https://linkedin.com/in/robertomancini',
        is_primary: true,
      },
      {
        tenant_id: tenantId,
        company_id: gf.id,
        first_name: 'Anna',
        last_name: 'Colombo',
        role: 'referente',
        job_title: 'Account Manager',
        email: 'a.colombo@globalfreight.it',
        phone: '+39 011 5554433',
        is_primary: false,
      },
      {
        tenant_id: tenantId,
        company_id: as_.id,
        first_name: 'Alessandro',
        last_name: 'Conti',
        role: 'decisore',
        job_title: 'Titolare',
        email: 'a.conti@adriaticospedizioni.it',
        mobile: '+39 347 8889900',
        is_primary: true,
      },
      {
        tenant_id: tenantId,
        company_id: as_.id,
        first_name: 'Francesca',
        last_name: 'Romano',
        role: 'operativo',
        job_title: 'Coordinatrice Spedizioni',
        email: 'f.romano@adriaticospedizioni.it',
        is_primary: false,
      },
      {
        tenant_id: tenantId,
        company_id: noc.id,
        first_name: 'Elena',
        last_name: 'Fontana',
        role: 'decisore',
        job_title: 'Amministratrice Delegata',
        email: 'e.fontana@nordovestcorrieri.it',
        mobile: '+39 320 6677889',
        is_primary: true,
      },
      {
        tenant_id: tenantId,
        company_id: noc.id,
        first_name: 'Silvia',
        last_name: 'Martinelli',
        role: 'referente',
        job_title: 'Responsabile Acquisti',
        email: 's.martinelli@nordovestcorrieri.it',
        is_primary: false,
      },
    ])
    .select()

  if (conErr || !contacts) throw new Error('Errore inserimento contatti: ' + conErr?.message)

  const [cMarco, , cGiuseppe, , cRoberto, , cAlessandro, , cElena] = contacts

  // Deals
  const { data: deals, error: dealErr } = await supabase
    .from('deals')
    .insert([
      {
        tenant_id: tenantId,
        title: 'Rinnovo contratto triennale – Trasporti Veloci',
        company_id: tv.id,
        stage_id: stageMap['Negoziazione'],
        value: 45000,
        probability: 70,
        expected_close: daysFromNow(30),
        notes: 'Cliente storico, negoziazione su volume minimo garantito e SLA.',
      },
      {
        tenant_id: tenantId,
        title: 'Servizi logistica integrata – Logistica Express',
        company_id: le.id,
        stage_id: stageMap['Proposta'],
        value: 22000,
        probability: 45,
        expected_close: daysFromNow(45),
        notes: 'Proposta inviata il 10/04. In attesa di feedback dal board.',
      },
      {
        tenant_id: tenantId,
        title: 'Accordo partnership groupage EU – Global Freight',
        company_id: gf.id,
        stage_id: stageMap['Qualificazione'],
        value: 18000,
        probability: 30,
        expected_close: daysFromNow(60),
      },
      {
        tenant_id: tenantId,
        title: 'Contratto annuale spedizioni Adriatico – Adriatico Spedizioni',
        company_id: as_.id,
        stage_id: stageMap['Chiuso Vinto'],
        value: 38000,
        probability: 100,
        expected_close: dateAgo(15),
        actual_close: dateAgo(15),
        notes: 'Contratto firmato. Avvio operativo previsto 1° maggio.',
      },
      {
        tenant_id: tenantId,
        title: 'Progetto corridoio nord-ovest – Nord Ovest Corrieri',
        company_id: noc.id,
        stage_id: stageMap['Primo Contatto'],
        value: 12000,
        probability: 20,
        expected_close: daysFromNow(90),
      },
      {
        tenant_id: tenantId,
        title: 'Espansione servizi warehouse – Global Freight',
        company_id: gf.id,
        stage_id: stageMap['Chiuso Perso'],
        value: 15000,
        probability: 0,
        expected_close: dateAgo(30),
        actual_close: dateAgo(20),
        lost_reason: 'Budget congelato per ristrutturazione interna. Ricontattare Q4.',
      },
    ])
    .select()

  if (dealErr || !deals) throw new Error('Errore inserimento deal: ' + dealErr?.message)

  const [dTv, dLe, dGf] = deals

  // Tasks
  await supabase.from('tasks').insert([
    {
      tenant_id: tenantId,
      title: 'Follow-up offerta – Logistica Express',
      description: 'Verificare se hanno letto la proposta inviata. Chiedere feedback e prossimi step.',
      status: 'pending',
      priority: 'high',
      due_date: dateAgo(3),
      company_id: le.id,
      contact_id: cGiuseppe.id,
      deal_id: dLe.id,
    },
    {
      tenant_id: tenantId,
      title: 'Inviare proposta revisata – Global Freight',
      description: 'Revisionare i termini di pagamento e ricalcolare il pricing per 500 spedizioni/mese.',
      status: 'pending',
      priority: 'urgent',
      due_date: dateAgo(1),
      company_id: gf.id,
      contact_id: cRoberto.id,
      deal_id: dGf.id,
    },
    {
      tenant_id: tenantId,
      title: 'Chiamata di allineamento con Marco Rossi',
      description: 'Aggiornamento sullo stato della trattativa e firma preliminare.',
      status: 'pending',
      priority: 'high',
      due_date: daysFromNow(0),
      company_id: tv.id,
      contact_id: cMarco.id,
      deal_id: dTv.id,
    },
    {
      tenant_id: tenantId,
      title: 'Preparare bozza contratto – Adriatico Spedizioni',
      description: 'Bozza contratto annuale con tariffe concordate e SLA.',
      status: 'in_progress',
      priority: 'medium',
      due_date: daysFromNow(0),
      company_id: as_.id,
      contact_id: cAlessandro.id,
    },
    {
      tenant_id: tenantId,
      title: 'Revisione accordo Nord Ovest Corrieri',
      description: 'Analizzare i volumi 2025 e preparare proposta competitiva.',
      status: 'pending',
      priority: 'medium',
      due_date: daysFromNow(3),
      company_id: noc.id,
      contact_id: cElena.id,
    },
    {
      tenant_id: tenantId,
      title: 'Demo piattaforma TMS per Logistica Express',
      description: 'Presentare le funzionalità di tracking real-time e reportistica.',
      status: 'pending',
      priority: 'low',
      due_date: daysFromNow(7),
      company_id: le.id,
    },
    {
      tenant_id: tenantId,
      title: 'Report mensile pipeline aprile',
      description: 'Consolidare i dati di pipeline e preparare presentazione per la direzione.',
      status: 'pending',
      priority: 'medium',
      due_date: daysFromNow(5),
    },
    {
      tenant_id: tenantId,
      title: 'Aggiornare schede clienti attivi nel CRM',
      description: 'Verificare e aggiornare i dati di contatto e le informazioni commerciali.',
      status: 'pending',
      priority: 'low',
      due_date: daysFromNow(14),
    },
  ])

  // Activities
  await supabase.from('activities').insert([
    {
      tenant_id: tenantId,
      type: 'call',
      title: 'Chiamata iniziale – Marco Rossi',
      body: 'Prima chiamata per discutere rinnovo contratto. Marco è interessato ma vuole rivedere i termini sul volume minimo. Prossimo step: inviare proposta formale.',
      company_id: tv.id,
      contact_id: cMarco.id,
      deal_id: dTv.id,
      duration_min: 25,
      occurred_at: daysAgo(14),
    },
    {
      tenant_id: tenantId,
      type: 'email',
      title: 'Invio proposta – Trasporti Veloci',
      body: 'Inviata proposta commerciale con nuove tariffe e SLA migliorati. Incluso confronto con contratto precedente.',
      company_id: tv.id,
      contact_id: cMarco.id,
      deal_id: dTv.id,
      occurred_at: daysAgo(10),
    },
    {
      tenant_id: tenantId,
      type: 'meeting',
      title: 'Incontro presentazione – Logistica Express',
      body: 'Presentato il catalogo servizi. Giuseppe Ferrari molto interessato al modulo di tracking. Chiesto preventivo entro fine settimana.',
      company_id: le.id,
      contact_id: cGiuseppe.id,
      deal_id: dLe.id,
      duration_min: 60,
      occurred_at: daysAgo(12),
    },
    {
      tenant_id: tenantId,
      type: 'email',
      title: 'Invio offerta – Logistica Express',
      body: 'Offerta personalizzata inviata: pacchetto base + modulo tracking + SLA 99.5%. Validità 30 giorni.',
      company_id: le.id,
      contact_id: cGiuseppe.id,
      deal_id: dLe.id,
      occurred_at: daysAgo(8),
    },
    {
      tenant_id: tenantId,
      type: 'call',
      title: 'Primo contatto – Roberto Mancini',
      body: 'Chiamata di discovery. Global Freight gestisce 2000+ spedizioni/mese EU. Budget disponibile ma decision process lungo (3-4 mesi). Key driver: affidabilità e integrazione API.',
      company_id: gf.id,
      contact_id: cRoberto.id,
      deal_id: dGf.id,
      duration_min: 40,
      occurred_at: daysAgo(20),
    },
    {
      tenant_id: tenantId,
      type: 'note',
      title: 'Note incontro fiera Transpotec',
      body: 'Incontrato Roberto Mancini e Anna Colombo allo stand. Molto interessati alla sessione sulle spedizioni multimodali. Scambiati contatti.',
      company_id: gf.id,
      occurred_at: daysAgo(30),
    },
    {
      tenant_id: tenantId,
      type: 'meeting',
      title: 'Firma contratto – Adriatico Spedizioni',
      body: 'Alessandro Conti ha firmato il contratto annuale. Inizio operativo 1° maggio. Da concordare onboarding operativo con Francesca Romano.',
      company_id: as_.id,
      contact_id: cAlessandro.id,
      duration_min: 45,
      occurred_at: daysAgo(15),
    },
    {
      tenant_id: tenantId,
      type: 'whatsapp',
      title: 'Conferma appuntamento – Alessandro Conti',
      body: 'Confermato incontro per firma contratto per giovedì 10:00.',
      company_id: as_.id,
      contact_id: cAlessandro.id,
      occurred_at: daysAgo(17),
    },
    {
      tenant_id: tenantId,
      type: 'call',
      title: 'Cold call – Elena Fontana',
      body: 'Prima chiamata a freddo. Elena è la AD. Apertura buona, ha chiesto di richiamare dopo le ferie. Volume attuale: ~300 spedizioni/mese Liguria-Piemonte.',
      company_id: noc.id,
      contact_id: cElena.id,
      duration_min: 15,
      occurred_at: daysAgo(7),
    },
    {
      tenant_id: tenantId,
      type: 'email',
      title: 'Invio brochure servizi – Nord Ovest Corrieri',
      body: 'Inviato materiale commerciale con case study di clienti simili nella distribuzione locale.',
      company_id: noc.id,
      contact_id: cElena.id,
      occurred_at: daysAgo(6),
    },
    {
      tenant_id: tenantId,
      type: 'note',
      title: 'Analisi competitor – Logistica Express',
      body: 'Giuseppe ha menzionato che il contratto attuale con DHL scade il 30 giugno. Sensibile sul pricing ma il vero differenziatore è la piattaforma di tracking. Possiamo vincere su qualità del servizio.',
      company_id: le.id,
      contact_id: cGiuseppe.id,
      occurred_at: daysAgo(5),
    },
    {
      tenant_id: tenantId,
      type: 'call',
      title: 'Call di follow-up – Trasporti Veloci',
      body: 'Laura Bianchi ha confermato che la proposta è piaciuta. Il CEO vuole un incontro di negoziazione entro fine mese. Ottimo segnale.',
      company_id: tv.id,
      contact_id: cMarco.id,
      deal_id: dTv.id,
      duration_min: 20,
      occurred_at: daysAgo(4),
    },
    {
      tenant_id: tenantId,
      type: 'visit',
      title: 'Visita sede operativa – Trasporti Veloci',
      body: 'Tour del magazzino di Segrate. Visto il flusso operativo: 400+ consegne/giorno. Ottima struttura. Possibilità di integrare il nostro TMS con il loro WMS.',
      company_id: tv.id,
      contact_id: cMarco.id,
      duration_min: 120,
      occurred_at: daysAgo(21),
    },
    {
      tenant_id: tenantId,
      type: 'email',
      title: 'Recap incontro e prossimi step – Global Freight',
      body: 'Inviato riassunto della chiamata con Roberto. Allegata scheda tecnica sulle API di integrazione e la documentazione del corridoio EU.',
      company_id: gf.id,
      contact_id: cRoberto.id,
      deal_id: dGf.id,
      occurred_at: daysAgo(18),
    },
    {
      tenant_id: tenantId,
      type: 'note',
      title: 'Deal perso – Global Freight warehouse',
      body: 'Roberto ha comunicato che il progetto warehouse è stato congelato per una ristrutturazione interna. Nessun budget disponibile nel 2026. Ricontattare a settembre per Q4.',
      company_id: gf.id,
      occurred_at: daysAgo(20),
    },
  ])
}
