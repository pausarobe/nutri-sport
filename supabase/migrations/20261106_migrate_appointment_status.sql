alter table public.client_appointments
  add column status text;

update public.client_appointments
set status = case
  when completed then 'completed'
  else 'scheduled'
end;

alter table public.client_appointments
  alter column status set default 'scheduled',
  alter column status set not null;

alter table public.client_appointments
  add constraint client_appointments_status_check check (
    status in ('scheduled', 'completed', 'cancelled', 'no_show')
  );

drop index if exists public.client_appointments_user_upcoming_idx;
create index client_appointments_user_upcoming_idx
  on public.client_appointments(user_id, status, scheduled_date asc, scheduled_time asc);

alter table public.client_appointments
  drop column completed;
