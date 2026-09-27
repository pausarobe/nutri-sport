alter table public.client_appointments
  add column if not exists duration_minutes integer not null default 60
  check (duration_minutes between 15 and 480);
