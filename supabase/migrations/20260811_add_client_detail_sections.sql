alter table public.plans
  add column if not exists calories integer check (calories is null or calories > 0),
  add column if not exists protein_g numeric(7,2) check (protein_g is null or protein_g >= 0),
  add column if not exists carbs_g numeric(7,2) check (carbs_g is null or carbs_g >= 0),
  add column if not exists fat_g numeric(7,2) check (fat_g is null or fat_g >= 0),
  add column if not exists energy_settings jsonb not null default '{}'::jsonb,
  add column if not exists meal_distribution jsonb not null default
    '[{"name":"Desayuno","pct":20},{"name":"Media manana","pct":10},{"name":"Comida","pct":30},{"name":"Merienda","pct":15},{"name":"Cena","pct":20},{"name":"Recena","pct":5}]'::jsonb;

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
    or sex in ('female', 'male', 'non_binary', 'prefer_not_to_say')
  ),
  skinfolds jsonb not null default '{}'::jsonb,
  girths jsonb not null default '{}'::jsonb,
  diameters jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.client_appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  scheduled_date date not null,
  scheduled_time time,
  appointment_type text not null default 'Revision mensual',
  notes text,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_weight_logs_client_id_measured_at_idx
  on public.client_weight_logs(client_id, measured_at desc);

create index if not exists client_anthropometry_client_id_measured_at_idx
  on public.client_anthropometry_assessments(client_id, measured_at desc);

create index if not exists client_appointments_client_id_scheduled_idx
  on public.client_appointments(client_id, scheduled_date asc, scheduled_time asc);

create index if not exists client_appointments_user_upcoming_idx
  on public.client_appointments(user_id, completed, scheduled_date asc, scheduled_time asc);

drop trigger if exists set_client_appointments_updated_at on public.client_appointments;
create trigger set_client_appointments_updated_at
before update on public.client_appointments
for each row execute function public.set_updated_at();

alter table public.client_weight_logs enable row level security;
alter table public.client_anthropometry_assessments enable row level security;
alter table public.client_appointments enable row level security;

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

notify pgrst, 'reload schema';
