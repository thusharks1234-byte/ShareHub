-- ShareHub core marketplace schema. Additive only; no existing application data is altered.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  avatar_path text,
  bio text check (bio is null or char_length(bio) <= 500),
  city text check (city is null or char_length(city) <= 100),
  locality text check (locality is null or char_length(locality) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  icon text,
  created_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  description text not null check (char_length(btrim(description)) between 1 and 1200),
  rent_per_day integer not null check (rent_per_day between 1 and 5000),
  security_deposit integer not null default 0 check (security_deposit between 0 and 50000),
  city text not null check (char_length(btrim(city)) between 1 and 100),
  locality text not null check (char_length(btrim(locality)) between 1 and 100),
  status text not null default 'draft' check (status in ('active', 'paused', 'draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listings_id_owner_unique unique (id, owner_id)
);

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) <= 500),
  display_order smallint not null check (display_order between 0 and 4),
  created_at timestamptz not null default now(),
  constraint listing_images_order_unique unique (listing_id, display_order)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  renter_id uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  constraint conversations_listing_owner_fkey
    foreign key (listing_id, owner_id)
    references public.listings (id, owner_id) on delete cascade,
  constraint conversations_participants_differ check (owner_id <> renter_id),
  constraint conversations_listing_renter_unique unique (listing_id, renter_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index listings_active_newest_idx on public.listings (created_at desc, id) where status = 'active';
create index listings_owner_status_created_idx on public.listings (owner_id, status, created_at desc);
create index listings_category_status_created_idx on public.listings (category_id, status, created_at desc);
create index listings_city_locality_status_idx on public.listings (lower(city), lower(locality), status);
create index conversations_owner_recent_idx on public.conversations (owner_id, last_message_at desc nulls last);
create index conversations_renter_recent_idx on public.conversations (renter_id, last_message_at desc nulls last);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at);
create index messages_unread_conversation_idx on public.messages (conversation_id, created_at) where read_at is null;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function private.touch_updated_at();

create trigger listings_touch_updated_at
before update on public.listings
for each row execute function private.touch_updated_at();

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_sharehub_profile
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create or replace function private.enforce_active_listing_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_count integer;
begin
  if new.status = 'active'
     and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    perform 1 from public.profiles where id = new.owner_id for update;
    select pg_catalog.count(*) into active_count
    from public.listings
    where owner_id = new.owner_id and status = 'active';
    if active_count >= 10 then
      raise exception 'A user may have at most 10 active listings.' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger listings_enforce_active_limit
before insert or update of status on public.listings
for each row execute function private.enforce_active_listing_limit();

create or replace function private.update_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_update_conversation_last_message
after insert on public.messages
for each row execute function private.update_conversation_last_message();

revoke all on function private.touch_updated_at() from public, anon, authenticated;
revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
revoke all on function private.enforce_active_listing_limit() from public, anon, authenticated;
revoke all on function private.update_conversation_last_message() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

revoke all privileges on table public.profiles, public.categories, public.listings,
  public.listing_images, public.conversations, public.messages from anon, authenticated;
grant all privileges on table public.profiles, public.categories, public.listings,
  public.listing_images, public.conversations, public.messages to service_role;
grant select on public.profiles, public.categories, public.listings, public.listing_images to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant insert, update, delete on public.listings to authenticated;
grant insert, update, delete on public.listing_images to authenticated;
grant select, insert on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;

create policy profiles_public_select
  on public.profiles for select to anon, authenticated using (true);
create policy profiles_owner_insert
  on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_owner_update
  on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy categories_public_select
  on public.categories for select to anon, authenticated using (true);

create policy listings_public_or_owner_select
  on public.listings for select to anon, authenticated
  using (status = 'active' or owner_id = (select auth.uid()));
create policy listings_owner_insert
  on public.listings for insert to authenticated with check (owner_id = (select auth.uid()));
create policy listings_owner_update
  on public.listings for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy listings_owner_delete
  on public.listings for delete to authenticated using (owner_id = (select auth.uid()));

create policy listing_images_public_or_owner_select
  on public.listing_images for select to anon, authenticated
  using (exists (
    select 1 from public.listings l
    where l.id = listing_id and (l.status = 'active' or l.owner_id = (select auth.uid()))
  ));
create policy listing_images_owner_insert
  on public.listing_images for insert to authenticated
  with check (exists (
    select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid())
  ));
create policy listing_images_owner_update
  on public.listing_images for update to authenticated
  using (exists (
    select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid())
  ));
create policy listing_images_owner_delete
  on public.listing_images for delete to authenticated
  using (exists (
    select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid())
  ));

create policy conversations_participant_select
  on public.conversations for select to authenticated
  using ((select auth.uid()) in (owner_id, renter_id));
create policy conversations_renter_insert
  on public.conversations for insert to authenticated
  with check (
    renter_id = (select auth.uid())
    and owner_id <> (select auth.uid())
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = owner_id and l.status = 'active'
    )
  );

create policy messages_participant_select
  on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (select auth.uid()) in (c.owner_id, c.renter_id)
  ));
create policy messages_participant_insert
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (select auth.uid()) in (c.owner_id, c.renter_id)
    )
  );
create policy messages_recipient_mark_read
  on public.messages for update to authenticated
  using (
    sender_id <> (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (select auth.uid()) in (c.owner_id, c.renter_id)
    )
  )
  with check (
    sender_id <> (select auth.uid()) and read_at is not null
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (select auth.uid()) in (c.owner_id, c.renter_id)
    )
  );

-- Storage bucket creation is intentionally not done through internal Storage tables.
-- After creating the bucket with the supported Storage management UI/API, these policies apply.
create policy sharehub_listing_images_public_read
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'listing-images'
    and exists (
      select 1 from public.listing_images li
      join public.listings l on l.id = li.listing_id
      where li.storage_path = name and (l.status = 'active' or l.owner_id = (select auth.uid()))
    )
  );
create policy sharehub_listing_images_owner_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.listings l
      where l.id::text = (storage.foldername(name))[2]
        and l.owner_id = (select auth.uid())
    )
    and exists (select 1 from public.listing_images li where li.storage_path = name)
  );
create policy sharehub_listing_images_owner_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.listings l
      where l.id::text = (storage.foldername(name))[2]
        and l.owner_id = (select auth.uid())
    )
    and exists (select 1 from public.listing_images li where li.storage_path = name)
  )
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.listings l
      where l.id::text = (storage.foldername(name))[2]
        and l.owner_id = (select auth.uid())
    )
    and exists (select 1 from public.listing_images li where li.storage_path = name)
  );
create policy sharehub_listing_images_owner_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.listings l
      where l.id::text = (storage.foldername(name))[2]
        and l.owner_id = (select auth.uid())
    )
    and exists (select 1 from public.listing_images li where li.storage_path = name)
  );

insert into public.categories (name, slug, description, icon) values
  ('Electronics & Gadgets', 'electronics-gadgets', 'Cameras, audio, and everyday tech.', 'laptop'),
  ('Tools & Equipment', 'tools-equipment', 'Useful tools for home and hands-on projects.', 'wrench'),
  ('Books & Study Materials', 'books-study-materials', 'Books and supplies for learning.', 'book-open'),
  ('Sports & Fitness', 'sports-fitness', 'Gear for movement, training, and play.', 'dumbbell'),
  ('Outdoor & Camping', 'outdoor-camping', 'Equipment for weekends outside.', 'tent-tree'),
  ('Home & Kitchen', 'home-kitchen', 'Practical essentials for home and cooking.', 'house'),
  ('Events & Party Equipment', 'events-party-equipment', 'Items for gatherings and celebrations.', 'party-popper'),
  ('Other Items', 'other-items', 'More useful things shared locally.', 'boxes')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon;

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_catalog.pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
     ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
