-- Defense in depth: rows that reference a debrief must reference the
-- caller's own debrief. Previously the insert policies only checked
-- user_id, so a message or shift could point at another user's debrief_id
-- (harmless in practice — RLS blocked all reads/writes across users — but
-- the reference itself should be impossible).

alter policy "messages_insert_own" on public.messages
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.debriefs d
      where d.id = debrief_id and d.user_id = (select auth.uid())
    )
  );

alter policy "shifts_insert_own" on public.shifts
  with check (
    user_id = (select auth.uid())
    and (
      debrief_id is null
      or exists (
        select 1 from public.debriefs d
        where d.id = debrief_id and d.user_id = (select auth.uid())
      )
    )
  );
