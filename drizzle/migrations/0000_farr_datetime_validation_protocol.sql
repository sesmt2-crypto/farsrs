ALTER TABLE public.far_records ADD COLUMN IF NOT EXISTS record_datetime timestamptz NOT NULL DEFAULT now();
UPDATE public.far_records SET record_datetime = record_date::timestamp AT TIME ZONE 'America/Sao_Paulo';
GRANT SELECT, INSERT ON public.far_records TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.far_records TO authenticated;
GRANT ALL ON public.far_records TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
CREATE OR REPLACE FUNCTION public.validate_farr_record() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF length(trim(NEW.cipeiro)) = 0 OR length(NEW.cipeiro) > 150 OR length(trim(NEW.setor)) = 0 OR length(NEW.setor) > 150 OR length(trim(NEW.encarregado)) = 0 OR length(NEW.encarregado) > 150 OR length(trim(NEW.risk_condition)) = 0 OR length(NEW.risk_condition) > 5000 OR length(trim(NEW.corrective_action)) = 0 OR length(NEW.corrective_action) > 5000 OR length(trim(NEW.responsible)) = 0 OR length(NEW.responsible) > 150 OR length(coalesce(NEW.supervisor,'')) > 150 THEN
    RAISE EXCEPTION 'Preencha os campos obrigatórios e respeite os limites de tamanho.';
  END IF;
  IF NEW.before_image_url IS NULL OR trim(NEW.before_image_url) = '' OR NEW.after_image_url IS NULL OR trim(NEW.after_image_url) = '' THEN
    RAISE EXCEPTION 'As fotos ANTES e DEPOIS são obrigatórias.';
  END IF;
  IF NEW.status NOT IN ('CONCLUÍDO', 'EM ANDAMENTO', 'PENDENTE') THEN RAISE EXCEPTION 'Status inválido.'; END IF;
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_advisory_xact_lock(7261830);
    SELECT 'FAR-' || lpad((coalesce(max(substring(far_number from '^FAR-([0-9]+)$')::bigint),0)+1)::text, greatest(3,length((coalesce(max(substring(far_number from '^FAR-([0-9]+)$')::bigint),0)+1)::text)), '0') INTO NEW.far_number FROM public.far_records;
  ELSE
    NEW.far_number := OLD.far_number;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_farr_before_write BEFORE INSERT OR UPDATE ON public.far_records FOR EACH ROW EXECUTE FUNCTION public.validate_farr_record();