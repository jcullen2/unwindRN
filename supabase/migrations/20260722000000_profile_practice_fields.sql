-- Practice context captured at onboarding (previously collected in the UI but
-- never persisted). All nullable, owner-visible only — RLS on profiles already
-- scopes every row to auth.uid(); no policy changes needed.
alter table profiles
  add column if not exists hospital text,
  add column if not exists city text,
  add column if not exists unit text,
  add column if not exists shift_pattern text;
