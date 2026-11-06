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

drop trigger if exists set_nutritionist_profiles_updated_at
on public.nutritionist_profiles;
create trigger set_nutritionist_profiles_updated_at
before update on public.nutritionist_profiles
for each row execute function public.set_updated_at();

alter table public.nutritionist_profiles enable row level security;

drop policy if exists "Nutritionist profiles are private to their owner"
on public.nutritionist_profiles;
create policy "Nutritionist profiles are private to their owner"
on public.nutritionist_profiles
for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
