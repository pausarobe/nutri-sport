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
  account_plan text not null default 'free' check (account_plan in ('free', 'pro')),
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

create table if not exists public.client_bonuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  total_sessions integer not null check (total_sessions between 1 and 200),
  starts_on date not null default current_date,
  valid_until date,
  is_active boolean not null default true,
  public_token uuid not null default gen_random_uuid() unique,
  public_access_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_bonuses_validity_range check (
    valid_until is null or valid_until >= starts_on
  )
);

create table if not exists public.client_bonus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bonus_id uuid not null references public.client_bonuses(id) on delete cascade,
  consumed_at date not null default current_date,
  created_at timestamptz not null default now()
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

create index if not exists client_bonuses_user_created_at_idx
  on public.client_bonuses(user_id, created_at desc);

create index if not exists client_bonuses_client_created_at_idx
  on public.client_bonuses(client_id, created_at desc);

create index if not exists client_bonus_sessions_bonus_consumed_idx
  on public.client_bonus_sessions(bonus_id, consumed_at desc, created_at desc);

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists set_nutritionist_profiles_updated_at
on public.nutritionist_profiles;
create trigger set_nutritionist_profiles_updated_at
before update on public.nutritionist_profiles
for each row execute function public.set_updated_at();

create or replace function public.guard_account_plan()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.role()) = 'authenticated' then
    if tg_op = 'INSERT' then
      new.account_plan := 'free';
    elsif new.account_plan is distinct from old.account_plan then
      raise exception 'Only an administrator can change the account plan.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_nutritionist_account_plan
on public.nutritionist_profiles;
create trigger guard_nutritionist_account_plan
before insert or update on public.nutritionist_profiles
for each row execute function public.guard_account_plan();

create or replace function public.has_pro_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.nutritionist_profiles
    where user_id = (select auth.uid())
      and account_plan = 'pro'
  );
$$;

revoke all on function public.has_pro_access() from public;
grant execute on function public.has_pro_access() to authenticated;

drop trigger if exists set_plans_updated_at on public.plans;
create trigger set_plans_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

drop trigger if exists set_client_appointments_updated_at on public.client_appointments;
create trigger set_client_appointments_updated_at
before update on public.client_appointments
for each row execute function public.set_updated_at();

drop trigger if exists set_client_bonuses_updated_at on public.client_bonuses;
create trigger set_client_bonuses_updated_at
before update on public.client_bonuses
for each row execute function public.set_updated_at();

create or replace function public.validate_client_bonus_session()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  bonus_record public.client_bonuses%rowtype;
  consumed_count integer;
begin
  select * into bonus_record
  from public.client_bonuses
  where id = new.bonus_id
  for update;

  if bonus_record.id is null then
    raise exception 'Bonus not found.';
  end if;

  if new.user_id <> bonus_record.user_id then
    raise exception 'The bonus session owner is invalid.';
  end if;

  if not bonus_record.is_active then
    raise exception 'The bonus is inactive.';
  end if;

  if new.consumed_at < bonus_record.starts_on
    or (bonus_record.valid_until is not null and new.consumed_at > bonus_record.valid_until)
  then
    raise exception 'The session date is outside the bonus validity period.';
  end if;

  select count(*) into consumed_count
  from public.client_bonus_sessions
  where bonus_id = new.bonus_id
    and (tg_op = 'INSERT' or id <> new.id);

  if consumed_count >= bonus_record.total_sessions then
    raise exception 'The bonus has no remaining sessions.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_client_bonus_session
on public.client_bonus_sessions;
create trigger validate_client_bonus_session
before insert or update on public.client_bonus_sessions
for each row execute function public.validate_client_bonus_session();

alter table public.clients enable row level security;
alter table public.nutritionist_profiles enable row level security;
alter table public.plans enable row level security;
alter table public.client_notes enable row level security;
alter table public.client_files enable row level security;
alter table public.client_weight_logs enable row level security;
alter table public.client_anthropometry_assessments enable row level security;
alter table public.client_appointments enable row level security;
alter table public.client_bonuses enable row level security;
alter table public.client_bonus_sessions enable row level security;

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
using (
  user_id = (select auth.uid())
  and (select public.has_pro_access())
)
with check (
  user_id = (select auth.uid())
  and (select public.has_pro_access())
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
using (
  user_id = (select auth.uid())
  and (select public.has_pro_access())
)
with check (
  user_id = (select auth.uid())
  and (select public.has_pro_access())
  and exists (
    select 1
    from public.clients
    where clients.id = client_appointments.client_id
      and clients.user_id = (select auth.uid())
  )
);

drop policy if exists "Bonuses are private to their owner"
on public.client_bonuses;
create policy "Bonuses are private to their owner"
on public.client_bonuses
for all
using (
  user_id = (select auth.uid())
  and (select public.has_pro_access())
)
with check (
  user_id = (select auth.uid())
  and (select public.has_pro_access())
  and exists (
    select 1
    from public.clients
    where clients.id = client_bonuses.client_id
      and clients.user_id = (select auth.uid())
  )
);

drop policy if exists "Bonus sessions are private to their owner"
on public.client_bonus_sessions;
create policy "Bonus sessions are private to their owner"
on public.client_bonus_sessions
for all
using (
  user_id = (select auth.uid())
  and (select public.has_pro_access())
)
with check (
  user_id = (select auth.uid())
  and (select public.has_pro_access())
  and exists (
    select 1
    from public.client_bonuses
    where client_bonuses.id = client_bonus_sessions.bonus_id
      and client_bonuses.user_id = (select auth.uid())
  )
);

create or replace function public.get_public_bonus(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'name', bonus.name,
    'client_name', client.name,
    'clinic_name', coalesce(profile.clinic_name, 'Consulta de nutrición'),
    'professional_name', coalesce(profile.display_name, 'Nutricionista'),
    'total_sessions', bonus.total_sessions,
    'used_sessions', usage.used_sessions,
    'remaining_sessions', greatest(bonus.total_sessions - usage.used_sessions, 0),
    'starts_on', bonus.starts_on,
    'valid_until', bonus.valid_until,
    'status', case
      when not bonus.is_active then 'inactive'
      when bonus.valid_until is not null
        and bonus.valid_until < (now() at time zone profile.time_zone)::date
        then 'expired'
      when usage.used_sessions >= bonus.total_sessions then 'completed'
      when bonus.starts_on > (now() at time zone profile.time_zone)::date then 'scheduled'
      else 'active'
    end,
    'sessions', usage.sessions,
    'updated_at', bonus.updated_at
  )
  from public.client_bonuses as bonus
  join public.clients as client on client.id = bonus.client_id
  join public.nutritionist_profiles as profile on profile.user_id = bonus.user_id
  cross join lateral (
    select
      count(*)::integer as used_sessions,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'consumed_at', session.consumed_at
          )
          order by session.consumed_at desc, session.created_at desc
        ),
        '[]'::jsonb
      ) as sessions
    from public.client_bonus_sessions as session
    where session.bonus_id = bonus.id
  ) as usage
  where bonus.public_token = p_token
    and bonus.public_access_enabled
    and profile.account_plan = 'pro';
$$;

revoke all on function public.get_public_bonus(uuid) from public;
grant execute on function public.get_public_bonus(uuid) to anon, authenticated;

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
  and (select public.has_pro_access())
);

drop policy if exists "Users can upload own client files" on storage.objects;
create policy "Users can upload own client files"
on storage.objects
for insert
with check (
  bucket_id = 'client-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.has_pro_access())
);

drop policy if exists "Users can update own client files" on storage.objects;
create policy "Users can update own client files"
on storage.objects
for update
using (
  bucket_id = 'client-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.has_pro_access())
)
with check (
  bucket_id = 'client-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.has_pro_access())
);

drop policy if exists "Users can delete own client files" on storage.objects;
create policy "Users can delete own client files"
on storage.objects
for delete
using (
  bucket_id = 'client-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.has_pro_access())
);
