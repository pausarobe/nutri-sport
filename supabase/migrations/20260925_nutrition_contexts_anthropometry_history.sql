-- Planes por contexto, sexo biológico y edición completa de antropometrías.
-- Los contextos nutricionales se guardan en plans.energy_settings, por lo que
-- no requieren columnas nuevas.

update public.clients
set sex = null
where sex is not null and sex not in ('female', 'male');

alter table public.clients
  drop constraint if exists clients_sex_check;

alter table public.clients
  add constraint clients_sex_check
  check (sex is null or sex in ('female', 'male'));

update public.client_anthropometry_assessments
set sex = null
where sex is not null and sex not in ('female', 'male');

alter table public.client_anthropometry_assessments
  drop constraint if exists client_anthropometry_assessments_sex_check;

alter table public.client_anthropometry_assessments
  add constraint client_anthropometry_assessments_sex_check
  check (sex is null or sex in ('female', 'male'));

alter table public.client_anthropometry_assessments
  add column if not exists race text not null default 'caucasian',
  add column if not exists sitting_height_cm numeric(5,2),
  add column if not exists arm_span_cm numeric(5,2),
  add column if not exists measurements3 jsonb not null default '{}'::jsonb;

update public.client_anthropometry_assessments
set race = case
  when race in ('black', 'negra') then 'black'
  when race in ('asian', 'asiatica') then 'asian'
  else 'caucasian'
end;

alter table public.client_anthropometry_assessments
  drop constraint if exists client_anthropometry_assessments_race_check;

alter table public.client_anthropometry_assessments
  add constraint client_anthropometry_assessments_race_check
  check (race in ('caucasian', 'black', 'asian'));

alter table public.client_anthropometry_assessments
  drop constraint if exists client_anthropometry_assessments_sitting_height_cm_check;

alter table public.client_anthropometry_assessments
  add constraint client_anthropometry_assessments_sitting_height_cm_check
  check (sitting_height_cm is null or sitting_height_cm > 0);

alter table public.client_anthropometry_assessments
  drop constraint if exists client_anthropometry_assessments_arm_span_cm_check;

alter table public.client_anthropometry_assessments
  add constraint client_anthropometry_assessments_arm_span_cm_check
  check (arm_span_cm is null or arm_span_cm > 0);

notify pgrst, 'reload schema';
