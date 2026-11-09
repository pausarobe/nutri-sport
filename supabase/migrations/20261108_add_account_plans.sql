alter table public.nutritionist_profiles
  add column if not exists account_plan text default 'free';

update public.nutritionist_profiles
set account_plan = 'free'
where account_plan is null;

alter table public.nutritionist_profiles
  alter column account_plan set default 'free',
  alter column account_plan set not null;

alter table public.nutritionist_profiles
  drop constraint if exists nutritionist_profiles_account_plan_check;
alter table public.nutritionist_profiles
  add constraint nutritionist_profiles_account_plan_check
  check (account_plan in ('free', 'pro'));

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

drop policy if exists "File metadata is private to their owner"
on public.client_files;
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

drop policy if exists "Appointments are private to their owner"
on public.client_appointments;
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
