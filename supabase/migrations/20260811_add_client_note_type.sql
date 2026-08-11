alter table public.client_notes
  add column if not exists note_type text not null default 'normal'
  check (note_type in ('normal', 'supplement'));

create index if not exists client_notes_client_id_note_type_created_at_idx
  on public.client_notes(client_id, note_type, created_at desc);

notify pgrst, 'reload schema';
