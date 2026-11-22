-- Run after applying migrations with a local Supabase stack or an approved test project.
do $$
declare
  expected_categories integer;
begin
  if (select count(*) from information_schema.tables where table_schema = 'public' and table_name in
      ('profiles', 'categories', 'listings', 'listing_images', 'conversations', 'messages')) <> 6 then
    raise exception 'Expected all six ShareHub tables.';
  end if;

  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in
      ('profiles', 'categories', 'listings', 'listing_images', 'conversations', 'messages')
      and not c.relrowsecurity
  ) then
    raise exception 'RLS must be enabled on every ShareHub table.';
  end if;

  select count(*) into expected_categories from public.categories;
  if expected_categories <> 8 then
    raise exception 'Expected exactly eight reference categories; found %.', expected_categories;
  end if;
end;
$$;
