create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  sex text check (
    sex is null
    or sex in ('female', 'male', 'non_binary', 'prefer_not_to_say')
  ),
  birth_date date,
  height_cm numeric(5,2) check (height_cm is null or height_cm > 0),
  weight_kg numeric(5,2) check (weight_kg is null or weight_kg > 0),
  sport text,
  activity_level text check (
    activity_level is null
    or activity_level in ('sedentary', 'light', 'moderate', 'high', 'very_high')
  ),
  goal text,
  allergies text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plans_one_current_plan_per_client unique (client_id)
);

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.client_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  bucket_id text not null default 'client-files',
  path text not null,
  file_name text not null,
  content_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  constraint client_files_path_unique unique (path)
);

create index if not exists clients_user_id_created_at_idx
  on public.clients(user_id, created_at desc);

create index if not exists plans_user_id_client_id_idx
  on public.plans(user_id, client_id);

create index if not exists client_notes_client_id_created_at_idx
  on public.client_notes(client_id, created_at desc);

create index if not exists client_files_client_id_created_at_idx
  on public.client_files(client_id, created_at desc);

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists set_plans_updated_at on public.plans;
create trigger set_plans_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

alter table public.clients enable row level security;
alter table public.plans enable row level security;
alter table public.client_notes enable row level security;
alter table public.client_files enable row level security;

drop policy if exists "Clients are private to their owner" on public.clients;
create policy "Clients are private to their owner"
on public.clients
for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Plans are private to their owner" on public.plans;
create policy "Plans are private to their owner"
on public.plans
for all
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.clients
    where clients.id = plans.client_id
      and clients.user_id = (select auth.uid())
  )
);

drop policy if exists "Notes are private to their owner" on public.client_notes;
create policy "Notes are private to their owner"
on public.client_notes
for all
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.clients
    where clients.id = client_notes.client_id
      and clients.user_id = (select auth.uid())
  )
);

drop policy if exists "File metadata is private to their owner" on public.client_files;
create policy "File metadata is private to their owner"
on public.client_files
for all
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and bucket_id = 'client-files'
  and exists (
    select 1
    from public.clients
    where clients.id = client_files.client_id
      and clients.user_id = (select auth.uid())
  )
);

insert into storage.buckets (id, name, public, file_size_limit)
values ('client-files', 'client-files', false, 10485760)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760;

drop policy if exists "Users can read own client files" on storage.objects;
create policy "Users can read own client files"
on storage.objects
for select
using (
  bucket_id = 'client-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can upload own client files" on storage.objects;
create policy "Users can upload own client files"
on storage.objects
for insert
with check (
  bucket_id = 'client-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can update own client files" on storage.objects;
create policy "Users can update own client files"
on storage.objects
for update
using (
  bucket_id = 'client-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'client-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can delete own client files" on storage.objects;
create policy "Users can delete own client files"
on storage.objects
for delete
using (
  bucket_id = 'client-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
