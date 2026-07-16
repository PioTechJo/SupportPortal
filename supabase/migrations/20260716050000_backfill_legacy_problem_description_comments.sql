-- Migration: Backfill "Problem Description" (from the legacy ticket import)
-- into ticket_comments so it shows up in the ticket's comment/activity
-- thread, not just the tickets.description column.
-- Idempotent: skips tickets that already have this backfilled comment.

INSERT INTO public.ticket_comments (ticket_id, author_id, comment_text, is_system_generated, is_internal, created_at)
SELECT
  t.id,
  t.created_by,
  '[Legacy Problem Description]' || E'\n\n' || t.description,
  true,
  true,
  t.created_at
FROM public.tickets t
WHERE t.legacy_ticket_id IS NOT NULL
  AND t.description IS NOT NULL
  AND t.description <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.ticket_comments c
    WHERE c.ticket_id = t.id
      AND c.comment_text LIKE '[Legacy Problem Description]%'
  );
