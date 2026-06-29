
CREATE TABLE public.far_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  far_number TEXT NOT NULL,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cipeiro TEXT NOT NULL,
  encarregado TEXT NOT NULL,
  supervisor TEXT,
  setor TEXT NOT NULL,
  risk_condition TEXT NOT NULL,
  corrective_action TEXT NOT NULL,
  responsible TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONCLUÍDO',
  before_image_url TEXT,
  after_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.far_records TO anon, authenticated;
GRANT ALL ON public.far_records TO service_role;

ALTER TABLE public.far_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view far records" ON public.far_records FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert far records" ON public.far_records FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update far records" ON public.far_records FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete far records" ON public.far_records FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX idx_far_records_created_at ON public.far_records(created_at DESC);
