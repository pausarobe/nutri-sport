alter table public.clients
  add column if not exists sex text,
  add column if not exists birth_date date,
  add column if not exists height_cm numeric(5,2),
  add column if not exists weight_kg numeric(5,2),
  add column if not exists sport text,
  add column if not exists activity_level text,
  add column if not exists allergies text;

alter table public.clients
  drop constraint if exists clients_sex_check,
  add constraint clients_sex_check
  check (
    sex is null
    or sex in ('female', 'male', 'non_binary', 'prefer_not_to_say')
  );

alter table public.clients
  drop constraint if exists clients_activity_level_check,
  add constraint clients_activity_level_check
  check (
    activity_level is null
    or activity_level in ('sedentary', 'light', 'moderate', 'high', 'very_high')
  );

alter table public.clients
  drop constraint if exists clients_height_cm_check,
  add constraint clients_height_cm_check
  check (height_cm is null or height_cm > 0);

alter table public.clients
  drop constraint if exists clients_weight_kg_check,
  add constraint clients_weight_kg_check
  check (weight_kg is null or weight_kg > 0);
