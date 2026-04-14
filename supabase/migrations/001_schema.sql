-- ============================================================
-- DanCRM — Schema Database v1.0
-- Esegui questo file nel SQL Editor di Supabase
-- ============================================================

-- ENUM TYPES
CREATE TYPE member_role    AS ENUM ('owner','admin','manager','sales','viewer');
CREATE TYPE company_status AS ENUM ('prospect','lead','active','inactive','churned');
CREATE TYPE company_type   AS ENUM ('prospect','cliente','fornitore','partner','altro');
CREATE TYPE contact_role   AS ENUM ('decisore','operativo','referente','altro');
CREATE TYPE activity_type  AS ENUM ('call','email','meeting','note','task_done','whatsapp','linkedin','visit','other');
CREATE TYPE task_status    AS ENUM ('pending','in_progress','done','cancelled');
CREATE TYPE task_priority  AS ENUM ('low','medium','high','urgent');

-- ============================================================
-- TENANTS
-- ============================================================
CREATE TABLE tenants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,
  logo_url        text,
  primary_color   text DEFAULT '#3B82F6',
  website         text,
  phone           text,
  email           text,
  address         text,
  city            text,
  province        text,
  cap             text,
  country         text DEFAULT 'IT',
  piva            text,
  codice_fiscale  text,
  setup_completed boolean DEFAULT false,
  plan            text DEFAULT 'free',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ============================================================
-- TENANT MEMBERS
-- ============================================================
CREATE TABLE tenant_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        member_role NOT NULL DEFAULT 'sales',
  full_name   text,
  avatar_url  text,
  invited_at  timestamptz DEFAULT now(),
  joined_at   timestamptz,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- ============================================================
-- PIPELINE STAGES
-- ============================================================
CREATE TABLE pipeline_stages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text DEFAULT '#6366F1',
  position    integer NOT NULL DEFAULT 0,
  is_won      boolean DEFAULT false,
  is_lost     boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE companies (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name               text NOT NULL,
  type               company_type DEFAULT 'prospect',
  status             company_status DEFAULT 'prospect',
  website            text,
  phone              text,
  email              text,
  address            text,
  city               text,
  province           text,
  cap                text,
  country            text DEFAULT 'IT',
  piva               text,
  codice_fiscale     text,
  sector             text,
  employee_count     integer,
  annual_revenue     numeric(15,2),
  annual_shipments   integer,
  preferred_service  text,
  service_area       text[],
  has_warehouse      boolean DEFAULT false,
  notes              text,
  owner_id           uuid REFERENCES auth.users(id),
  tms_client_id      text,
  tms_synced_at      timestamptz,
  created_by         uuid REFERENCES auth.users(id),
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE contacts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id   uuid REFERENCES companies(id) ON DELETE SET NULL,
  first_name   text NOT NULL,
  last_name    text NOT NULL,
  role         contact_role DEFAULT 'referente',
  job_title    text,
  email        text,
  phone        text,
  mobile       text,
  linkedin_url text,
  notes        text,
  is_primary   boolean DEFAULT false,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- ============================================================
-- DEALS
-- ============================================================
CREATE TABLE deals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title          text NOT NULL,
  company_id     uuid REFERENCES companies(id) ON DELETE SET NULL,
  stage_id       uuid REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  value          numeric(15,2),
  currency       text DEFAULT 'EUR',
  probability    integer DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  expected_close date,
  actual_close   date,
  lost_reason    text,
  notes          text,
  owner_id       uuid REFERENCES auth.users(id),
  created_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE TABLE deal_contacts (
  deal_id    uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (deal_id, contact_id)
);

-- ============================================================
-- ACTIVITIES
-- ============================================================
CREATE TABLE activities (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type         activity_type NOT NULL,
  title        text,
  body         text,
  occurred_at  timestamptz DEFAULT now(),
  duration_min integer,
  company_id   uuid REFERENCES companies(id) ON DELETE CASCADE,
  contact_id   uuid REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id      uuid REFERENCES deals(id) ON DELETE CASCADE,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  status       task_status DEFAULT 'pending',
  priority     task_priority DEFAULT 'medium',
  due_date     date,
  due_time     time,
  company_id   uuid REFERENCES companies(id) ON DELETE SET NULL,
  contact_id   uuid REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id      uuid REFERENCES deals(id) ON DELETE SET NULL,
  assigned_to  uuid REFERENCES auth.users(id),
  created_by   uuid REFERENCES auth.users(id),
  completed_at timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- ============================================================
-- TAGS
-- ============================================================
CREATE TABLE tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       text NOT NULL,
  color      text DEFAULT '#6366F1',
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE TABLE company_tags (
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tag_id     uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (company_id, tag_id)
);

CREATE TABLE contact_tags (
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id     uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

-- ============================================================
-- TMS INTEGRATION
-- ============================================================
CREATE TABLE tms_sync_config (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  tms_supabase_url text,
  tms_anon_key     text,
  tms_user_token   text,
  last_synced_at   timestamptz,
  sync_enabled     boolean DEFAULT false,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE TABLE tms_imported_clients (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tms_client_id  text NOT NULL,
  company_id     uuid REFERENCES companies(id) ON DELETE SET NULL,
  raw_data       jsonb,
  imported_at    timestamptz DEFAULT now(),
  last_synced_at timestamptz,
  UNIQUE(tenant_id, tms_client_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_tenant_members_user   ON tenant_members(user_id);
CREATE INDEX idx_tenant_members_tenant ON tenant_members(tenant_id);
CREATE INDEX idx_companies_tenant      ON companies(tenant_id);
CREATE INDEX idx_companies_status      ON companies(tenant_id, status);
CREATE INDEX idx_companies_owner       ON companies(tenant_id, owner_id);
CREATE INDEX idx_companies_tms         ON companies(tenant_id, tms_client_id) WHERE tms_client_id IS NOT NULL;
CREATE INDEX idx_contacts_tenant       ON contacts(tenant_id);
CREATE INDEX idx_contacts_company      ON contacts(company_id);
CREATE INDEX idx_deals_tenant          ON deals(tenant_id);
CREATE INDEX idx_deals_stage           ON deals(tenant_id, stage_id);
CREATE INDEX idx_deals_company         ON deals(company_id);
CREATE INDEX idx_activities_company    ON activities(company_id, occurred_at DESC);
CREATE INDEX idx_activities_deal       ON activities(deal_id, occurred_at DESC);
CREATE INDEX idx_activities_tenant     ON activities(tenant_id, occurred_at DESC);
CREATE INDEX idx_tasks_tenant_due      ON tasks(tenant_id, due_date) WHERE status != 'done';
CREATE INDEX idx_tasks_assigned        ON tasks(assigned_to, due_date) WHERE status != 'done';

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tms_sync_updated_at
  BEFORE UPDATE ON tms_sync_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Ritorna il tenant_id dell'utente corrente
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS uuid AS $$
  SELECT tenant_id FROM public.tenant_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Verifica ruolo minimo
CREATE OR REPLACE FUNCTION has_role(required_role text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = auth.uid()
    AND role = ANY(
      CASE required_role
        WHEN 'viewer'  THEN ARRAY['viewer','sales','manager','admin','owner']::member_role[]
        WHEN 'sales'   THEN ARRAY['sales','manager','admin','owner']::member_role[]
        WHEN 'manager' THEN ARRAY['manager','admin','owner']::member_role[]
        WHEN 'admin'   THEN ARRAY['admin','owner']::member_role[]
        WHEN 'owner'   THEN ARRAY['owner']::member_role[]
        ELSE ARRAY[]::member_role[]
      END
    )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE tenants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals                ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_contacts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_tags         ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tms_sync_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tms_imported_clients ENABLE ROW LEVEL SECURITY;

-- TENANTS
CREATE POLICY "tenants_select" ON tenants FOR SELECT
  USING (id = current_tenant_id());
CREATE POLICY "tenants_update" ON tenants FOR UPDATE
  USING (id = current_tenant_id() AND has_role('admin'));
CREATE POLICY "tenants_insert" ON tenants FOR INSERT
  WITH CHECK (true); -- gestito da funzione di registrazione

-- TENANT MEMBERS
CREATE POLICY "members_select" ON tenant_members FOR SELECT
  USING (tenant_id = current_tenant_id());
CREATE POLICY "members_insert" ON tenant_members FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() AND has_role('admin'));
CREATE POLICY "members_update" ON tenant_members FOR UPDATE
  USING (tenant_id = current_tenant_id() AND has_role('admin'));
CREATE POLICY "members_delete" ON tenant_members FOR DELETE
  USING (tenant_id = current_tenant_id() AND has_role('owner'));

-- PIPELINE STAGES
CREATE POLICY "stages_select" ON pipeline_stages FOR SELECT
  USING (tenant_id = current_tenant_id());
CREATE POLICY "stages_insert" ON pipeline_stages FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() AND has_role('manager'));
CREATE POLICY "stages_update" ON pipeline_stages FOR UPDATE
  USING (tenant_id = current_tenant_id() AND has_role('manager'));
CREATE POLICY "stages_delete" ON pipeline_stages FOR DELETE
  USING (tenant_id = current_tenant_id() AND has_role('admin'));

-- COMPANIES
CREATE POLICY "companies_select" ON companies FOR SELECT
  USING (tenant_id = current_tenant_id());
CREATE POLICY "companies_insert" ON companies FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() AND has_role('sales'));
CREATE POLICY "companies_update" ON companies FOR UPDATE
  USING (tenant_id = current_tenant_id() AND has_role('sales'));
CREATE POLICY "companies_delete" ON companies FOR DELETE
  USING (tenant_id = current_tenant_id() AND has_role('manager'));

-- CONTACTS
CREATE POLICY "contacts_select" ON contacts FOR SELECT
  USING (tenant_id = current_tenant_id());
CREATE POLICY "contacts_insert" ON contacts FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() AND has_role('sales'));
CREATE POLICY "contacts_update" ON contacts FOR UPDATE
  USING (tenant_id = current_tenant_id() AND has_role('sales'));
CREATE POLICY "contacts_delete" ON contacts FOR DELETE
  USING (tenant_id = current_tenant_id() AND has_role('manager'));

-- DEALS
CREATE POLICY "deals_select" ON deals FOR SELECT
  USING (tenant_id = current_tenant_id());
CREATE POLICY "deals_insert" ON deals FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() AND has_role('sales'));
CREATE POLICY "deals_update" ON deals FOR UPDATE
  USING (tenant_id = current_tenant_id() AND has_role('sales'));
CREATE POLICY "deals_delete" ON deals FOR DELETE
  USING (tenant_id = current_tenant_id() AND has_role('manager'));

-- DEAL CONTACTS
CREATE POLICY "deal_contacts_select" ON deal_contacts FOR SELECT
  USING (deal_id IN (SELECT id FROM deals WHERE tenant_id = current_tenant_id()));
CREATE POLICY "deal_contacts_insert" ON deal_contacts FOR INSERT
  WITH CHECK (deal_id IN (SELECT id FROM deals WHERE tenant_id = current_tenant_id()));
CREATE POLICY "deal_contacts_delete" ON deal_contacts FOR DELETE
  USING (deal_id IN (SELECT id FROM deals WHERE tenant_id = current_tenant_id()));

-- ACTIVITIES
CREATE POLICY "activities_select" ON activities FOR SELECT
  USING (tenant_id = current_tenant_id());
CREATE POLICY "activities_insert" ON activities FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() AND has_role('sales'));
CREATE POLICY "activities_update" ON activities FOR UPDATE
  USING (tenant_id = current_tenant_id() AND created_by = auth.uid());
CREATE POLICY "activities_delete" ON activities FOR DELETE
  USING (tenant_id = current_tenant_id() AND (created_by = auth.uid() OR has_role('manager')));

-- TASKS
CREATE POLICY "tasks_select" ON tasks FOR SELECT
  USING (tenant_id = current_tenant_id());
CREATE POLICY "tasks_insert" ON tasks FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() AND has_role('sales'));
CREATE POLICY "tasks_update" ON tasks FOR UPDATE
  USING (tenant_id = current_tenant_id() AND (assigned_to = auth.uid() OR has_role('manager')));
CREATE POLICY "tasks_delete" ON tasks FOR DELETE
  USING (tenant_id = current_tenant_id() AND (created_by = auth.uid() OR has_role('manager')));

-- TAGS
CREATE POLICY "tags_select" ON tags FOR SELECT
  USING (tenant_id = current_tenant_id());
CREATE POLICY "tags_insert" ON tags FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() AND has_role('sales'));
CREATE POLICY "tags_update" ON tags FOR UPDATE
  USING (tenant_id = current_tenant_id() AND has_role('manager'));
CREATE POLICY "tags_delete" ON tags FOR DELETE
  USING (tenant_id = current_tenant_id() AND has_role('manager'));

-- COMPANY / CONTACT TAGS
CREATE POLICY "company_tags_all" ON company_tags FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE tenant_id = current_tenant_id()));
CREATE POLICY "contact_tags_all" ON contact_tags FOR ALL
  USING (contact_id IN (SELECT id FROM contacts WHERE tenant_id = current_tenant_id()));

-- TMS SYNC CONFIG
CREATE POLICY "tms_config_select" ON tms_sync_config FOR SELECT
  USING (tenant_id = current_tenant_id());
CREATE POLICY "tms_config_insert" ON tms_sync_config FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() AND has_role('admin'));
CREATE POLICY "tms_config_update" ON tms_sync_config FOR UPDATE
  USING (tenant_id = current_tenant_id() AND has_role('admin'));

-- TMS IMPORTED CLIENTS
CREATE POLICY "tms_imported_all" ON tms_imported_clients FOR ALL
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- FUNZIONE REGISTRAZIONE NUOVO TENANT
-- Chiamata dopo la registrazione utente per creare il workspace
-- ============================================================
CREATE OR REPLACE FUNCTION create_tenant_for_new_user(
  p_user_id uuid,
  p_tenant_name text,
  p_full_name text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_tenant_id uuid;
  v_slug text;
BEGIN
  -- Genera slug dal nome
  v_slug := lower(regexp_replace(p_tenant_name, '[^a-zA-Z0-9]', '-', 'g'));
  v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 6);

  -- Crea il tenant
  INSERT INTO public.tenants (name, slug)
  VALUES (p_tenant_name, v_slug)
  RETURNING id INTO v_tenant_id;

  -- Aggiunge l'utente come owner
  INSERT INTO public.tenant_members (tenant_id, user_id, role, full_name, joined_at)
  VALUES (v_tenant_id, p_user_id, 'owner', p_full_name, now());

  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
