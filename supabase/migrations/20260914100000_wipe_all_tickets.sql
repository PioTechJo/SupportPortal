-- ============================================================================
-- DESTRUCTIVE, IRREVERSIBLE: deletes every ticket and everything tied to it
-- (comments, answers, attachments, history, followers, remote sessions, AI
-- recommendations, etc.) so the portal can go live with a clean slate.
-- Does NOT touch banks, users, products, email templates, or settings.
-- Take a Supabase backup/snapshot before running this if you want a way back.
-- ============================================================================

-- Automatically null out any foreign key column (in ANY table) that points at
-- tickets(id) and isn't already ON DELETE CASCADE, so the final DELETE below
-- doesn't get blocked no matter what's referencing a ticket (e.g. tickets.duplicate_of,
-- email_logs.related_ticket_id).
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      cl.relname AS referencing_table,
      att.attname AS referencing_column,
      att.attnotnull AS is_not_null
    FROM pg_constraint con
    JOIN pg_class cl ON cl.oid = con.conrelid
    JOIN pg_class reftable ON reftable.oid = con.confrelid
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
    WHERE con.contype = 'f'
      AND reftable.relname = 'tickets'
      AND reftable.relnamespace = 'public'::regnamespace
      AND con.confdeltype <> 'c' -- skip ones already ON DELETE CASCADE, they'll clean up on their own
  LOOP
    IF rec.is_not_null THEN
      -- Column can't be nulled (NOT NULL) - the referencing rows are only
      -- meaningful with a ticket, so delete them outright.
      EXECUTE format('DELETE FROM public.%I WHERE %I IS NOT NULL', rec.referencing_table, rec.referencing_column);
    ELSE
      EXECUTE format(
        'UPDATE public.%I SET %I = NULL WHERE %I IS NOT NULL',
        rec.referencing_table, rec.referencing_column, rec.referencing_column
      );
    END IF;
  END LOOP;
END $$;

-- Everything with ON DELETE CASCADE to tickets (ticket_answers, ticket_comments,
-- ticket_history, ticket_remote_sessions, ticket_followers, and any other
-- table with that cascade) is removed automatically by this single delete.
DELETE FROM public.tickets;

-- Note: this does NOT delete the uploaded files in the "ticket-attachments"
-- Storage bucket (SQL can't reach Storage) - clear that bucket separately from
-- the Supabase Dashboard > Storage if you want those gone too.
