-- Migration: Add temporary legacy assignee name field for migrated tickets
-- Purpose: Store the assignee name from the legacy system (as plain text) for
-- tickets migrated before real accounts exist for those assignees.
-- Once accounts are created, `assigned_to` should be populated with the real
-- auth.users(id) and this column can remain as a historical reference or be
-- dropped later.

ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS legacy_assignee_name text;

COMMENT ON COLUMN public.tickets.legacy_assignee_name IS
'Temporary: assignee name imported from legacy system before a real account (assigned_to) existed for them.';
