-- Applied 9 Sept 2026.
--
-- Cadence and next due date on a project, so cyclical work is a fact
-- about the row rather than something remembered. The school year turns
-- the same handles every year — term and semester changeover, the MoE
-- returns, year-end rollover, January orientation — and none of that
-- was distinguishable from one-off work.
--
-- Cadence is free text on purpose ("each term changeover", "March and
-- July", "January"), because the real cadences do not fit a rule and a
-- structured recurrence would be a much bigger thing to maintain than
-- it is worth here. next_due is a real date so it can be sorted and
-- filtered.
--
-- Deliberately NOT a fourth stream. stream says what KIND of work a row
-- is (operations / change / governance); cadence says how often it comes
-- round. A term changeover is operations AND cyclical, and making it
-- choose would have lost one of those. Anything with a cadence set is
-- cyclical — that is the marker, and there is only one place to keep it
-- true.
--
-- Adds:
--   projects.cadence text          how often it comes round, in words
--   projects.next_due date         when the next run is due
--   projects_next_due_idx          partial index for "what is coming up"
--
-- admin_update_project and admin_create_project both gained the two
-- fields. Unlike systems, these are ordinary editable project fields
-- rather than a cross-cutting label, so they belong on the main write
-- path and record history like every other field.
--
-- The live definitions are in the database; this file is the record of
-- what was applied. See the migration named add_cadence_dimension.

alter table public.projects
  add column if not exists cadence  text,
  add column if not exists next_due date;

comment on column public.projects.cadence is
  'How often this comes round, in words. Set = the row is cyclical.';
comment on column public.projects.next_due is
  'Date the next run is due. Sortable; null for one-off work.';

-- "What is coming up" only ever reads rows that have a date.
create index if not exists projects_next_due_idx
  on public.projects (next_due)
  where next_due is not null;
