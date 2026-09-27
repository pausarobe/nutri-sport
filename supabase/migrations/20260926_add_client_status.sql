alter table public.clients
  add column if not exists status text not null default 'active';

alter table public.clients
  drop constraint if exists clients_status_check;

alter table public.clients
  add constraint clients_status_check
  check (status in ('active', 'paused', 'inactive'));

create index if not exists clients_user_status_idx
  on public.clients (user_id, status);
