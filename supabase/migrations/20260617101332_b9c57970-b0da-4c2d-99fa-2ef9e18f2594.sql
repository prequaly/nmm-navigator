
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.action_status AS ENUM ('not_started','in_progress','blocked','at_risk','done','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.action_priority AS ENUM ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.meeting_cadence AS ENUM ('quarterly','monthly','weekly','adhoc');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.meeting_status AS ENUM ('scheduled','in_progress','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.attendance_status AS ENUM ('invited','attended','absent','excused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ DEPARTMENTS ============
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  lead_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  color text,
  meeting_day_of_week smallint, -- 0=Sun..6=Sat for weekly standup
  meeting_time time,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments_select" ON public.departments FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "departments_insert" ON public.departments FOR INSERT TO authenticated
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "departments_update" ON public.departments FOR UPDATE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()))
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "departments_delete" ON public.departments FOR DELETE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()));
CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_departments_org ON public.departments(organization_id);

-- ============ ACTION ITEMS ============
CREATE TABLE public.action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.strategic_plans(id) ON DELETE CASCADE,
  roadmap_item_id uuid REFERENCES public.roadmap_items(id) ON DELETE CASCADE,
  pillar_id uuid REFERENCES public.strategic_pillars(id) ON DELETE SET NULL,
  okr_id uuid REFERENCES public.okrs(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_label text,
  start_date date,
  due_date date,
  completed_at timestamptz,
  status public.action_status NOT NULL DEFAULT 'not_started',
  priority public.action_priority NOT NULL DEFAULT 'medium',
  percent_complete smallint NOT NULL DEFAULT 0,
  effort_hours numeric(8,2),
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_items TO authenticated;
GRANT ALL ON public.action_items TO service_role;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "action_items_select" ON public.action_items FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "action_items_insert" ON public.action_items FOR INSERT TO authenticated
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "action_items_update" ON public.action_items FOR UPDATE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()))
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "action_items_delete" ON public.action_items FOR DELETE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()));
CREATE TRIGGER trg_action_items_updated BEFORE UPDATE ON public.action_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_action_items_org ON public.action_items(organization_id);
CREATE INDEX idx_action_items_roadmap ON public.action_items(roadmap_item_id);
CREATE INDEX idx_action_items_dept ON public.action_items(department_id);
CREATE INDEX idx_action_items_owner ON public.action_items(owner_user_id);
CREATE INDEX idx_action_items_due ON public.action_items(due_date);

-- ============ SUB-TASKS ============
CREATE TABLE public.sub_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_item_id uuid NOT NULL REFERENCES public.action_items(id) ON DELETE CASCADE,
  title text NOT NULL,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date date,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sub_tasks TO authenticated;
GRANT ALL ON public.sub_tasks TO service_role;
ALTER TABLE public.sub_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_tasks_select" ON public.sub_tasks FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "sub_tasks_insert" ON public.sub_tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "sub_tasks_update" ON public.sub_tasks FOR UPDATE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()))
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "sub_tasks_delete" ON public.sub_tasks FOR DELETE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()));
CREATE TRIGGER trg_sub_tasks_updated BEFORE UPDATE ON public.sub_tasks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_sub_tasks_action ON public.sub_tasks(action_item_id);
CREATE INDEX idx_sub_tasks_owner ON public.sub_tasks(owner_user_id);

-- ============ MEETINGS ============
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.strategic_plans(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  cadence public.meeting_cadence NOT NULL,
  title text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  location text,
  status public.meeting_status NOT NULL DEFAULT 'scheduled',
  facilitator_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  scribe_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  summary text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meetings_select" ON public.meetings FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "meetings_insert" ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "meetings_update" ON public.meetings FOR UPDATE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()))
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "meetings_delete" ON public.meetings FOR DELETE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()));
CREATE TRIGGER trg_meetings_updated BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_meetings_org ON public.meetings(organization_id);
CREATE INDEX idx_meetings_dept ON public.meetings(department_id);
CREATE INDEX idx_meetings_scheduled ON public.meetings(scheduled_at);

-- ============ AGENDA ITEMS ============
CREATE TABLE public.meeting_agenda_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  presenter_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  duration_minutes int,
  source_kind text, -- 'pillar' | 'okr' | 'roadmap_item' | 'action_item' | 'risk' | 'kpi' | 'free'
  source_id uuid,
  auto_generated boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_agenda_items TO authenticated;
GRANT ALL ON public.meeting_agenda_items TO service_role;
ALTER TABLE public.meeting_agenda_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agenda_select" ON public.meeting_agenda_items FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "agenda_insert" ON public.meeting_agenda_items FOR INSERT TO authenticated
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "agenda_update" ON public.meeting_agenda_items FOR UPDATE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()))
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "agenda_delete" ON public.meeting_agenda_items FOR DELETE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()));
CREATE TRIGGER trg_agenda_updated BEFORE UPDATE ON public.meeting_agenda_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_agenda_meeting ON public.meeting_agenda_items(meeting_id);

-- ============ ATTENDEES ============
CREATE TABLE public.meeting_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name text,
  role text,
  status public.attendance_status NOT NULL DEFAULT 'invited',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_attendees TO authenticated;
GRANT ALL ON public.meeting_attendees TO service_role;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendees_select" ON public.meeting_attendees FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "attendees_insert" ON public.meeting_attendees FOR INSERT TO authenticated
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "attendees_update" ON public.meeting_attendees FOR UPDATE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()))
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "attendees_delete" ON public.meeting_attendees FOR DELETE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()));
CREATE INDEX idx_attendees_meeting ON public.meeting_attendees(meeting_id);

-- ============ MINUTES ============
CREATE TABLE public.meeting_minutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  agenda_item_id uuid REFERENCES public.meeting_agenda_items(id) ON DELETE SET NULL,
  body text NOT NULL,
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_minutes TO authenticated;
GRANT ALL ON public.meeting_minutes TO service_role;
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "minutes_select" ON public.meeting_minutes FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "minutes_insert" ON public.meeting_minutes FOR INSERT TO authenticated
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "minutes_update" ON public.meeting_minutes FOR UPDATE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()))
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "minutes_delete" ON public.meeting_minutes FOR DELETE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()));
CREATE TRIGGER trg_minutes_updated BEFORE UPDATE ON public.meeting_minutes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_minutes_meeting ON public.meeting_minutes(meeting_id);

-- ============ DECISIONS ============
CREATE TABLE public.meeting_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL,
  agenda_item_id uuid REFERENCES public.meeting_agenda_items(id) ON DELETE SET NULL,
  title text NOT NULL,
  rationale text,
  decided_by text,
  decided_at date NOT NULL DEFAULT (now()::date),
  impact text,
  follow_up text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_decisions TO authenticated;
GRANT ALL ON public.meeting_decisions TO service_role;
ALTER TABLE public.meeting_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "decisions_select" ON public.meeting_decisions FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "decisions_insert" ON public.meeting_decisions FOR INSERT TO authenticated
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "decisions_update" ON public.meeting_decisions FOR UPDATE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()))
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "decisions_delete" ON public.meeting_decisions FOR DELETE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()));
CREATE TRIGGER trg_decisions_updated BEFORE UPDATE ON public.meeting_decisions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_decisions_meeting ON public.meeting_decisions(meeting_id);

-- ============ MEETING ↔ ACTION ITEM LINKS ============
CREATE TABLE public.meeting_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  action_item_id uuid NOT NULL REFERENCES public.action_items(id) ON DELETE CASCADE,
  context text, -- 'reviewed' | 'created' | 'closed' | 'blocked' | free text
  commitment_owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  commitment_due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, action_item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_action_items TO authenticated;
GRANT ALL ON public.meeting_action_items TO service_role;
ALTER TABLE public.meeting_action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mai_select" ON public.meeting_action_items FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "mai_insert" ON public.meeting_action_items FOR INSERT TO authenticated
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "mai_update" ON public.meeting_action_items FOR UPDATE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()))
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "mai_delete" ON public.meeting_action_items FOR DELETE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()));
CREATE INDEX idx_mai_meeting ON public.meeting_action_items(meeting_id);
CREATE INDEX idx_mai_action ON public.meeting_action_items(action_item_id);
