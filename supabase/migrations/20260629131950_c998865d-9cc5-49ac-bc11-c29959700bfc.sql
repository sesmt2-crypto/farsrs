CREATE OR REPLACE FUNCTION public.get_next_far_number()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'FAR-' || LPAD(nextval('far_number_seq')::text, 3, '0');
$$;