-- Seed: Maria (Peds Onc, 3 yrs, 3/wk, est ~468 shifts / ~5600 hrs) + 16
-- realistic July shifts with varied load/tags/nights, so every screen has
-- real data to render.
--
-- Usage: sign in once in the app (creates the auth user), grab the user id
-- from Authentication → Users, then run in the SQL editor:
--   \set uid '00000000-0000-0000-0000-000000000000'
-- or replace :uid below with the literal uuid.

insert into public.profiles
  (id, display_name, specialty, years_in, shifts_per_week, usual_shift_hours,
   est_career_shifts, est_career_hours)
values
  (:'uid', 'Maria', 'Pediatric Oncology', 3, 3, 12, 468, 5600)
on conflict (id) do update set
  display_name = excluded.display_name,
  specialty = excluded.specialty,
  years_in = excluded.years_in,
  shifts_per_week = excluded.shifts_per_week,
  usual_shift_hours = excluded.usual_shift_hours,
  est_career_shifts = excluded.est_career_shifts,
  est_career_hours = excluded.est_career_hours;

insert into public.shifts
  (user_id, shift_date, hours, load, tags, is_night, win, weight, lesson, source)
values
  (:'uid', '2026-07-01', 12,   3, '{}',                        false, 'Got a needle-phobic kiddo through labs with zero tears.', '', 'The bubbles trick works every time.', 'voice'),
  (:'uid', '2026-07-02', 12.5, 4, '{"Short-staffed"}',         false, 'Team held the floor with two call-outs.', 'Everyone running on fumes by 1500.', '', 'taps'),
  (:'uid', '2026-07-04', 12,   2, '{"Quiet one"}',             false, 'Actually took a full lunch.', '', '', 'taps'),
  (:'uid', '2026-07-05', 13,   5, '{"Code","A loss"}',         false, 'The family got to be in the room. That mattered.', 'We lost him at 1840. First code of the month.', 'Speak up earlier when the numbers drift.', 'voice'),
  (:'uid', '2026-07-07', 12,   3, '{"Hard family"}',           true,  'De-escalated a dad who''d been sleeping in the chair for a week.', 'His anger wasn''t about me.', 'Sit down when you deliver hard updates.', 'voice'),
  (:'uid', '2026-07-08', 12,   3, '{}',                        true,  'Night crew hung together.', '', '', 'taps'),
  (:'uid', '2026-07-10', 12,   4, '{"Float"}',                 false, 'Floated to gen peds and still caught a wrong-dose order.', 'Floating always costs something.', 'Trust the gut check on unfamiliar units.', 'both'),
  (:'uid', '2026-07-11', 12,   2, '{"Good save"}',             false, 'Early sepsis catch — kid was septic-screening negative that morning.', '', 'Reassess after every parent “she seems off.”', 'voice'),
  (:'uid', '2026-07-13', 12,   3, '{"Precepting"}',            false, 'My orientee ran her first admission solo.', '', 'Let them struggle a little; catch them before harm.', 'taps'),
  (:'uid', '2026-07-14', 14,   5, '{"Short-staffed","Code"}',  false, 'Compressions were textbook. He made it to PICU.', 'Two hours over, hands finally shaking in the car.', '', 'voice'),
  (:'uid', '2026-07-15', 12,   3, '{}',                        false, 'Discharge day for a long-timer. Balloons in the hallway.', '', '', 'taps'),
  (:'uid', '2026-07-17', 12,   4, '{"Hard family"}',           true,  'Held the line on visitor limits without burning the bridge.', 'Nights make everything heavier.', '', 'voice'),
  (:'uid', '2026-07-18', 12,   3, '{}',                        true,  'Quiet enough to chart in real time for once.', '', '', 'taps'),
  (:'uid', '2026-07-20', 12,   4, '{"Charge"}',                false, 'First charge shift without calling the sup once.', 'Carrying the assignment board is different weight.', 'Delegate the small stuff sooner.', 'both'),
  (:'uid', '2026-07-22', 12,   2, '{"Quiet one"}',             false, 'Taught a new grad central line care, unhurried.', '', '', 'taps'),
  (:'uid', '2026-07-23', 12.5, 3, '{"Good save"}',             false, 'Caught an allergy interaction pharmacy missed.', '', 'The five rights still earn their keep.', 'voice');
