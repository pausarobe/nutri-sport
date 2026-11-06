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

create table if not exists public.nutritionist_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  clinic_name text,
  professional_title text,
  license_number text,
  professional_email text,
  phone text,
  address text,
  avatar_path text,
  logo_path text,
  signature_path text,
  time_zone text not null default 'Europe/Madrid',
  locale text not null default 'es-ES',
  agenda_start_time time not null default '07:00',
  agenda_end_time time not null default '22:00',
  default_appointment_duration integer not null default 60 check (
    default_appointment_duration between 15 and 480
  ),
  appointment_types text[] not null default array[
    'Revisión mensual',
    'Antropometría',
    'Primera visita',
    'Consulta',
    'Seguimiento'
  ]::text[],
  follow_up_days integer not null default 45 check (
    follow_up_days between 7 and 365
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nutritionist_profiles_agenda_range check (
    agenda_end_time > agenda_start_time
  )
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'active' check (
    status in ('active', 'paused', 'inactive')
  ),
  email text,
  phone text,
  sex text check (
    sex is null
    or sex in ('female', 'male')
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

create index if not exists clients_user_status_idx
  on public.clients (user_id, status);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  content text not null default '',
  calories integer check (calories is null or calories > 0),
  protein_g numeric(7,2) check (protein_g is null or protein_g >= 0),
  carbs_g numeric(7,2) check (carbs_g is null or carbs_g >= 0),
  fat_g numeric(7,2) check (fat_g is null or fat_g >= 0),
  energy_settings jsonb not null default '{}'::jsonb,
  meal_distribution jsonb not null default
    '[{"name":"Desayuno","pct":20},{"name":"Media manana","pct":10},{"name":"Comida","pct":30},{"name":"Merienda","pct":15},{"name":"Cena","pct":20},{"name":"Recena","pct":5}]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plans_one_current_plan_per_client unique (client_id)
);

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  content text not null,
  note_type text not null default 'normal' check (note_type in ('normal', 'supplement')),
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

create table if not exists public.client_weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  measured_at date not null default current_date,
  weight_kg numeric(5,2) not null check (weight_kg > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.client_anthropometry_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  measured_at date not null default current_date,
  height_cm numeric(5,2) not null check (height_cm > 0),
  weight_kg numeric(5,2) not null check (weight_kg > 0),
  sex text check (
    sex is null
    or sex in ('female', 'male')
  ),
  race text not null default 'caucasian' check (race in ('caucasian', 'black', 'asian')),
  sitting_height_cm numeric(5,2) check (sitting_height_cm is null or sitting_height_cm > 0),
  arm_span_cm numeric(5,2) check (arm_span_cm is null or arm_span_cm > 0),
  skinfolds jsonb not null default '{}'::jsonb,
  girths jsonb not null default '{}'::jsonb,
  diameters jsonb not null default '{}'::jsonb,
  measurements3 jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.client_appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  scheduled_date date not null,
  scheduled_time time,
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 480),
  appointment_type text not null default 'Revision mensual',
  notes text,
  status text not null default 'scheduled' check (
    status in ('scheduled', 'completed', 'cancelled', 'no_show')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_user_id_created_at_idx
  on public.clients(user_id, created_at desc);

create index if not exists plans_user_id_client_id_idx
  on public.plans(user_id, client_id);

create index if not exists client_notes_client_id_created_at_idx
  on public.client_notes(client_id, created_at desc);

create index if not exists client_notes_client_id_note_type_created_at_idx
  on public.client_notes(client_id, note_type, created_at desc);

create index if not exists client_files_client_id_created_at_idx
  on public.client_files(client_id, created_at desc);

create index if not exists client_weight_logs_client_id_measured_at_idx
  on public.client_weight_logs(client_id, measured_at desc);

create index if not exists client_anthropometry_client_id_measured_at_idx
  on public.client_anthropometry_assessments(client_id, measured_at desc);

create index if not exists client_appointments_client_id_scheduled_idx
  on public.client_appointments(client_id, scheduled_date asc, scheduled_time asc);

create index if not exists client_appointments_user_upcoming_idx
  on public.client_appointments(user_id, status, scheduled_date asc, scheduled_time asc);

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists set_nutritionist_profiles_updated_at
on public.nutritionist_profiles;
create trigger set_nutritionist_profiles_updated_at
before update on public.nutritionist_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_plans_updated_at on public.plans;
create trigger set_plans_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

drop trigger if exists set_client_appointments_updated_at on public.client_appointments;
create trigger set_client_appointments_updated_at
before update on public.client_appointments
for each row execute function public.set_updated_at();

alter table public.clients enable row level security;
alter table public.nutritionist_profiles enable row level security;
alter table public.plans enable row level security;
alter table public.client_notes enable row level security;
alter table public.client_files enable row level security;
alter table public.client_weight_logs enable row level security;
alter table public.client_anthropometry_assessments enable row level security;
alter table public.client_appointments enable row level security;

drop policy if exists "Nutritionist profiles are private to their owner"
on public.nutritionist_profiles;
create policy "Nutritionist profiles are private to their owner"
on public.nutritionist_profiles
for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

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

drop policy if exists "Weight logs are private to their owner" on public.client_weight_logs;
create policy "Weight logs are private to their owner"
on public.client_weight_logs
for all
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.clients
    where clients.id = client_weight_logs.client_id
      and clients.user_id = (select auth.uid())
  )
);

drop policy if exists "Anthropometry is private to their owner" on public.client_anthropometry_assessments;
create policy "Anthropometry is private to their owner"
on public.client_anthropometry_assessments
for all
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.clients
    where clients.id = client_anthropometry_assessments.client_id
      and clients.user_id = (select auth.uid())
  )
);

drop policy if exists "Appointments are private to their owner" on public.client_appointments;
create policy "Appointments are private to their owner"
on public.client_appointments
for all
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.clients
    where clients.id = client_appointments.client_id
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
