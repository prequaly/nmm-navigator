ALTER TABLE public.revenue_streams ALTER COLUMN plan_id DROP NOT NULL;
ALTER TABLE public.expense_lines ALTER COLUMN plan_id DROP NOT NULL;