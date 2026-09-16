-- "Last Login" always showed N/A because nothing ever wrote to
-- users.last_login on sign-in. SECURITY DEFINER so it works regardless of
-- whatever UPDATE RLS (if any) exists on public.users - a user can only ever
-- touch their own row via this function.

CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.users
  SET last_login = now()
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_last_login() TO authenticated;
