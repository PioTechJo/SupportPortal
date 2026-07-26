# Support Portal — Session Summary

## 1. Current Project Status

The portal is a Support Ticket system (React + Vite + Supabase) for Pio-Tech, serving internal support staff and external bank customers. This session picked up right after a maker-checker security fix (DB-level enforcement that only a bank role can approve a CLOSED ticket, and an APPROVED ticket can never be changed again).

**Completed and confirmed working by the user this session:**
- Legacy ticket migration cleanup (assignees, products, comments) is fully linked to real accounts.
- Overview dashboard is significantly enhanced (filters, search, pagination, zero-ticket-banks report).
- All Tickets list has a redesigned, mobile-responsive, customizable UI.
- New **Remote Check** and **Express Ticket** features are live end-to-end (including voice notes).
- Several latent bugs (see §2) were found and fixed along the way.
- Git working tree is clean — all changes appear to already be committed/synced (likely via the project's AI Studio auto-sync).

**Not yet done / explicitly deferred:**
- Dead table/column cleanup (see §4) — user said "not the right time," left for later.
- Auto-approve-on-timeout for CLOSED tickets — discussed only, no code written (explicitly a no-code discussion).
- WhatsApp bridge for ticket creation — discussed only, no code written.
- Voice-to-text transcription for Express Tickets — deferred by design (recording only, no transcript, for now).
- ~659 legacy tickets still have an unresolved product mapping (BankBPM bare, BO, CBS, BPM, LES, SAFATCA, FATCA CRS, BankCM, BankBICM, BPMFATCA, Loyal, and assorted parsing edge cases) — left on the placeholder "Legacy/Unspecified" product until the user decides the remaining mappings.

## 2. Key Technical Decisions & Root Causes Found

| Decision / Bug | Why |
|---|---|
| **Legacy assignees → real "pending" `auth.users` accounts** (not just a text field) | `tickets.assigned_to` is a real FK to `auth.users`. Matching by name string forever would mean permissions/filtering never work correctly for legacy tickets. Created 41 real (silent, `is_active=false`) accounts instead of copying names around. |
| **`ticket_workflow_trigger` blocks ANY update on an APPROVED ticket**, not just status changes | Found when bulk product/assignee backfills failed with `A ticket cannot be changed once it is APPROVED`. Fixed by wrapping bulk `UPDATE`s in `ALTER TABLE ... DISABLE/ENABLE TRIGGER` — a data backfill, not a workflow transition. |
| **Two parallel "assignee" columns existed**: `tickets.assigned_to` (real, used everywhere in app code) vs `tickets.assigned_user_id` (unused schema-drift leftover) | The Engineer Performance RPC was silently grouping by the *wrong* column. Fixed the RPC to use `assigned_to`. |
| **Engineer Performance showed duplicate rows for the same person** | RPC grouped by `(assigned_to, assigned_to_name, legacy_assigned_to)` together — different legacy name spellings for the same real account (e.g. "Firyal" vs "Feryal") created separate rows even after linking to one real account. Fixed by grouping only on the resolved identity. |
| **Search/filter boxes (Tickets list, Organizations list, bank filter) only searched the currently loaded page**, not the whole table | Root cause repeated 3+ times: pagination fetches ~50 rows client-side, and search/filter was applied to that subset instead of the server. Fixed by pushing search/filter into the Supabase query (`.ilike`, `.eq`) for Tickets, Organizations, and the bank-drilldown filter. |
| **Mobile sidebar invisible with no way to open it** | Two compounding bugs: (1) header (which held the only hamburger button) is hidden on ticket-detail pages by design, so on mobile there was zero nav; (2) a CSS specificity clash between the `md:` breakpoint variant and `ltr:`/`rtl:` direction variant made the sidebar stay hidden even on desktop in some cases. Fixed with a persistent floating menu button (independent of the header) + `md:!translate-x-0` important-override. |
| **Auth sometimes hangs forever on "Validating secure workspace session..."** | `supabase.auth.getSession()` can hang indefinitely in some tab-backgrounded/stale-token scenarios with no built-in timeout. Added an 8s fallback that uses the cached session and unblocks the UI. |
| **`invite-user` edge function gave a useless generic error** ("Edge Function returned a non-2xx status code") | The real reason (e.g. duplicate email) was in the response body, which `supabase-js` doesn't surface by default. Fixed the edge function to return a clear message + fixed the frontend to read `error.context.json()` for the real message. |
| **Voice notes for Express Tickets silently failed to attach** | The `ticket-attachments` storage bucket's `allowed_mime_types` didn't include `audio/webm`. Updated the bucket config directly, plus added a visible failure warning instead of silent failure going forward. |
| **Express Ticket can be disabled per-bank, silently** | Deliberate anti-abuse design per user's request: an admin toggle (`customers.express_enabled`) that hides the floating button for a specific bank with no explanation shown to them — the bank is expected to contact their admin if they notice it's gone. |
| **Legacy ticket product codes parsed from the "Tiket #" column** | Built a Node/regex parser against the actual migration Excel, auto-resolved ~3753 of 4412 tickets with confident rules (AML, FATCA, DWH, GOAML, etc.), left the ambiguous/low-confidence remainder untouched rather than guessing. |

## 3. Files Modified or Created This Session

### Frontend (`src/`)
- `src/pages/Overview.tsx` — filters (bank/engineer/year), search boxes (product, all-banks list), Banks-with-0-tickets card (replacing the old Top-10 chart), sortable + paginated Engineer Performance table, CSV export.
- `src/pages/Tickets.tsx` — full redesign (horizontal pill filters instead of sidebar), column visibility toggle, server-side search/engineer/customer filters, single-click row open, Express/Legacy badges, mobile padding fixes.
- `src/pages/TicketDetail.tsx` — Remote Check Request feature (button, modal, list card), parallelized data fetching (perf fix).
- `src/pages/Organizations.tsx` — server-side search fix.
- `src/components/AppLayout.tsx` — mobile drawer sidebar, persistent hamburger button, responsive header/main padding.
- `src/components/ExpressTicketButton.tsx` *(new)* — floating urgent-ticket button + modal, text + voice recording, per-bank enable check.
- `src/components/organizations/OrganizationContractsTab.tsx` — added `project_code` field (form + table column).
- `src/components/organizations/OrganizationOverviewTab.tsx` — Express Ticket Access admin toggle.
- `src/context/AuthContext.tsx` — auth init timeout fallback.
- `src/lib/api.ts` — server-side search params (`getTicketsPaginated`, `getTenantsPaginated`), `createExpressTicket`, `inviteUser` error-detail extraction, `legacy_assigned_to` passthrough.
- `src/hooks/useTickets.ts` — threaded `search`/`engineerId` params through `useTicketsPaginated`.
- `src/types.ts` — added `legacy_assigned_to`, `ticket_no`, `is_express` to `Ticket`.

### Backend (`supabase/`)
- `supabase/functions/invite-user/index.ts` — clear duplicate-email error message.
- `supabase/migrations/`:
  - `20260716000000_add_legacy_assignee_name.sql` *(superseded/dropped later)*
  - `20260716010000_drop_unused_legacy_assignee_name.sql`
  - `20260716020000_engineer_performance_legacy_assignee.sql`
  - `20260716030000_tickets_by_bank_full_list.sql`
  - `20260716040000_tickets_by_bank_include_customer_id.sql`
  - `20260716050000_backfill_legacy_problem_description_comments.sql`
  - `20260716060000_engineer_performance_use_assigned_to.sql`
  - `20260716070000_fix_engineer_performance_duplicate_grouping.sql`
  - `20260716080000_add_zero_ticket_banks.sql`
  - `20260716090000_add_ticket_remote_sessions.sql`
  - `20260716100000_add_project_code_to_contracts.sql`
  - `20260716110000_add_express_tickets.sql`
  - `20260716120000_add_express_enabled_toggle.sql`

### One-off data-migration scripts (repo root, `C:\Support Portal\`)
- `create_pending_users.cjs` — created the 41 real pending accounts (uses `process.env.SUPABASE_SERVICE_ROLE_KEY`, no hardcoded secret).
- `backfill_assigned_to.sql` — generated output of the script above (ticket → new account linking).

### Live DB/infra changes made directly (not via migration files, using the service role key provided in-session)
- Created 41 real `auth.users` + `public.users` rows (silent, `is_active=false`) for known legacy assignees, linked to `customers` (Pio-Tech Internal).
- Ran the product-code backfill UPDATE (from Excel "Tiket #" parsing) against `tickets.product_id` for ~3753 rows.
- Updated `ticket-attachments` storage bucket's `allowed_mime_types` to include audio formats.
- Deployed the updated `invite-user` edge function via `supabase functions deploy`.

## 4. Pending Issues / Deferred TODOs

1. **Dead tables** (confirmed zero rows + zero code references) — user deferred, not dropped:
   - `ai_chat_messages`
   - `customer_contacts`
   - `customer_products` (superseded by `organization_products`)
   - `ticket_internal_notes` (superseded by `ticket_comments.is_internal`)
2. **Dead column**: `tickets.assigned_user_id` (unused duplicate of `assigned_to`) — not dropped.
3. **~659 legacy tickets** still on the placeholder "Legacy/Unspecified" product — ambiguous Tiket# tokens (BankBPM bare, BO, CBS, BPM, LES, SAFATCA, FATCA CRS, BankCM, BankBICM, BPMFATCA, Loyal, malformed entries) need the user's manual call.
4. **Express Ticket misuse reporting** — discussed (per-bank usage report for management) but not built; only the manual per-bank disable toggle exists so far.
5. **Auto-approve-on-timeout for CLOSED tickets** — discussed only. Open question flagged: this would need a distinct `approval_method` marker (auto vs. manual) to not weaken the maker-checker audit trail — no decision made yet.
6. **WhatsApp → ticket bridge** — discussed as a concept only (Meta Cloud API / Twilio, phone-number-to-customer mapping, webhook → edge function). Not started.
7. **Voice-to-text for Express Tickets** — deferred; currently voice notes are stored as raw audio attachments only.
8. Two pre-existing/orphaned `auth.users` test accounts were noticed during other work (`haitham.m.n@gmail.com`) — not cleaned up, just worked around.

## 5. Temporary Scripts With Credentials — Cleanup Needed

**Good news: no script in the repo has a hardcoded secret.** The service role key was only ever passed as a shell environment variable at the moment of execution (`SUPABASE_SERVICE_ROLE_KEY='...' node create_pending_users.cjs`), typed directly into terminal commands during this chat — it was **never written into any file**.

That said, please do the following as good hygiene:

- **Rotate/regenerate the `service_role` key** in Supabase (Project Settings → API) since it was pasted in this chat session. This was flagged earlier in the session too.
- **Delete these leftover one-off scripts** from `C:\Support Portal\` now that their job is done (they're not part of the app and reference tables/logic that's already applied):
  - `create_pending_users.cjs`
  - `backfill_assigned_to.sql`
- The repo root already has many older one-off debug/migration `.cjs`/`.sql` files from before this session (e.g. `run_migration.cjs`, `batch_1.sql`...`batch_9.sql`, `get_*.cjs`, `check_*.cjs`, etc.) — none of these contain secrets either, but they're clutter worth a separate cleanup pass if you want a tidier repo root.
- `.env.example` in the repo is fine (placeholder values only, e.g. `MY_GEMINI_API_KEY`) — no real secret in it.

---
*Generated at the end of this session. Save this file or move it out of the repo root if you don't want it tracked long-term.*
