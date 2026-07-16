-- Migration: Remove unused duplicate column.
-- legacy_assigned_to (added earlier during the ticket data migration) already
-- holds the imported assignee names; legacy_assignee_name was a duplicate
-- added by mistake and was never populated.

ALTER TABLE public.tickets
DROP COLUMN IF EXISTS legacy_assignee_name;
