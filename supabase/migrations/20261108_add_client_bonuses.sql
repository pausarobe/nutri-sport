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

create index if not exists client_bonuses_user_created_at_idx
  on public.client_bonuses(user_id, created_at desc);
create index if not exists client_bonuses_client_created_at_idx
  on public.client_bonuses(client_id, created_at desc);
create index if not exists client_bonus_sessions_bonus_consumed_idx
  on public.client_bonus_sessions(bonus_id, consumed_at desc, created_at desc);

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

alter table public.client_bonuses enable row level security;
alter table public.client_bonus_sessions enable row level security;

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
