// One-time script: creates SILENT (no email sent) Supabase Auth accounts +
// matching public.users rows for the 41 known legacy assignees, marked
// is_active = false ("pending"). Later, when someone is actually onboarded,
// just flip is_active = true and send them a real invite/reset link — no
// need to touch tickets.assigned_to again, since it's already correct.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=xxxx node create_pending_users.cjs
//
// Requires the service role key (Project Settings -> API -> service_role).
// Never commit this key. Pass it via env var only.

if (!global.WebSocket) {
  global.WebSocket = require('ws');
}
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://ybacrvdkbgljdykdogpz.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var. Aborting.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// name | canonical full name | email | role ("Support" | "Developer") | legacy_assigned_to variants
const PEOPLE = [
  { name: 'Support', email: 'support@pio-tech.com', role: 'Support', legacyNames: ['Support'] },
  { name: 'Feryal Mithalouni', email: 'feryal.mithalouni@pio-tech.com', role: 'Support', legacyNames: ['Firyal Mithalouni', 'Feryal Mithalouni'] },
  { name: 'Husameddin Abubaker', email: 'husameddin.abubaker@pio-tech.com', role: 'Support', legacyNames: ['Husameddin', 'Husameddin Abubaker'] },
  { name: 'Raed Mansour', email: 'raed.mansour@pio-tech.com', role: 'Support', legacyNames: ['Raed Mansour'] },
  { name: 'Braa Alsabaten', email: 'braa.alsabaten@pio-tech.com', role: 'Support', legacyNames: ['Braa Alsabaten'] },
  { name: 'Mohammad Abedrabbu', email: 'mohammad.abedrabbu@pio-tech.com', role: 'Support', legacyNames: ['Mohammad Abedrabbu'] },
  { name: 'Hussam Daabes', email: 'hussam.daabes@pio-tech.com', role: 'Support', legacyNames: ['Hussam Daabes'] },
  { name: 'Mohammad Al-Tarazi', email: 'mohammad.altarazi@pio-tech.com', role: 'Support', legacyNames: ['Mohammad Al-Tarazi'] },
  { name: 'Afnan Alkatary', email: 'afnan.alkatary@pio-tech.com', role: 'Developer', legacyNames: ['Afnan Alkatary'] },
  { name: 'Mayada Abdelqader', email: 'mayada.abdelqader@pio-tech.com', role: 'Developer', legacyNames: ['Mayada Abdelqader'] },
  { name: 'Abdallah Al- Omari', email: 'abdallah.alomari@pio-tech.com', role: 'Support', legacyNames: ['Abdallah Al- Omari'] },
  { name: 'Mohammed Ramahi', email: 'mohammed.ramahi@pio-tech.com', role: 'Developer', legacyNames: ['Mohammed Ramahi'] },
  { name: 'Fadi Salman', email: 'fadi.salman@pio-tech.com', role: 'Support', legacyNames: ['Fadi Salman'] },
  { name: 'Abdullah Abdelrazzaq', email: 'abdullah.abdelrazzaq@pio-tech.com', role: 'Support', legacyNames: ['Abdullah Abdelrazzaq'] },
  { name: 'Mustafa Matalqah', email: 'mustafa.matalqah@pio-tech.com', role: 'Support', legacyNames: ['Mustafa Matalqah'] },
  { name: 'Banan Badwan', email: 'banan.badwan@pio-tech.com', role: 'Developer', legacyNames: ['Banan Badwan'] },
  { name: 'Ayat Katrameez', email: 'ayat.katrameez@pio-tech.com', role: 'Developer', legacyNames: ['Ayat Katrameez'] },
  { name: 'Saif Aladli', email: 'saif.aladli@pio-tech.com', role: 'Support', legacyNames: ['Saif Aladli'] },
  { name: 'Ibrahem Mallah', email: 'ibrahem.mallah@pio-tech.com', role: 'Developer', legacyNames: ['Ibrahem Mallah'] },
  { name: 'Samar Labib', email: 'samar.labib@pio-tech.com', role: 'Developer', legacyNames: ['Samar Labib'] },
  { name: 'Mamoun Al Saras', email: 'mamoun.alsaras@pio-tech.com', role: 'Developer', legacyNames: ['Mamoun Al Saras'] },
  { name: 'Mohammed Hasan', email: 'mohammed.hasan@pio-tech.com', role: 'Support', legacyNames: ['Mohammed Hasan'] },
  { name: 'Mohammad Al-Shaikh', email: 'mohammad.alshaikh@pio-tech.com', role: 'Support', legacyNames: ['Mohammad Al-Shaikh'] },
  { name: 'Asaad Omar', email: 'asaad.omar@pio-tech.com', role: 'Support', legacyNames: ['Asaad Omar'] },
  { name: 'Hausny AlBakry', email: 'hausny.albakry@pio-tech.com', role: 'Developer', legacyNames: ['Hausny AlBakry'] },
  { name: 'Ruba Al-Khatib', email: 'ruba.alkhatib@pio-tech.com', role: 'Developer', legacyNames: ['Ruba Al-Khatib'] },
  { name: 'Mohammad Safi', email: 'mohammad.safi@pio-tech.com', role: 'Developer', legacyNames: ['Mohammad Safi'] },
  { name: 'Husni Bakri', email: 'husni.bakri@pio-tech.com', role: 'Developer', legacyNames: ['Husni Bakri'] },
  { name: 'Hitham Dawod', email: 'hitham.dawod@pio-tech.com', role: 'Developer', legacyNames: ['Hitham Dawod'] },
  { name: 'Anas Al-Shawish', email: 'anas.alshawish@pio-tech.com', role: 'Support', legacyNames: ['Anas Al-Shawish'] },
  { name: 'Ruba Farhan', email: 'ruba.farhan@pio-tech.com', role: 'Support', legacyNames: ['Ruba Farhan'] },
  { name: 'Nader Ibdeir', email: 'nader.ibdeir@pio-tech.com', role: 'Developer', legacyNames: ['Nader Ibdeir'] },
  { name: 'Ahmad Al-Nashwati', email: 'ahmad.alnashwati@pio-tech.com', role: 'Support', legacyNames: ['Ahmad Al-Nashwati'] },
  { name: 'Rami Hajjiri', email: 'rami.hajjiri@pio-tech.com', role: 'Support', legacyNames: ['Rami Hajjiri'] },
  { name: 'Montaser Zaloom', email: 'montaser.zaloom@pio-tech.com', role: 'Support', legacyNames: ['Montaser Zaloom'] },
  { name: 'Ammar Mosleh', email: 'ammar.mosleh@pio-tech.com', role: 'Support', legacyNames: ['Ammar Mosleh'] },
  { name: 'Malek Al-Jawaldeh', email: 'malek.aljawaldeh@pio-tech.com', role: 'Developer', legacyNames: ['Malek Al-Jawaldeh'] },
  { name: 'Mohammad Al-Katry', email: 'mohammad.alkatry@pio-tech.com', role: 'Support', legacyNames: ['Mohammad Al-Katry'] },
  { name: 'Alaa Elayyan', email: 'alaa.elayyan@pio-tech.com', role: 'Support', legacyNames: ['Alaa Elayyan'] },
  { name: 'Jehad Darwazeh', email: 'jehad.darwazeh@pio-tech.com', role: 'Support', legacyNames: ['Jehad Darwazeh'] },
  { name: 'Rima Al-Hamed', email: 'rima.alhamed@pio-tech.com', role: 'Developer', legacyNames: ['Rima Al-Hamed'] },
];

const ROLE_CODE_MAP = { Support: 'SUPPORT_ENGINEER', Developer: 'TEAM_MEMBER' };

async function main() {
  const { data: roles, error: rolesErr } = await supabase.from('roles').select('id, role_code');
  if (rolesErr) throw rolesErr;
  const roleIdByCode = {};
  roles.forEach(r => { roleIdByCode[r.role_code] = r.id; });

  const results = [];

  for (const person of PEOPLE) {
    const roleCode = ROLE_CODE_MAP[person.role];
    const roleId = roleIdByCode[roleCode];
    if (!roleId) {
      console.error(`No role found for code ${roleCode}, skipping ${person.name}`);
      continue;
    }

    // Check if already exists (idempotent re-run)
    const { data: existing } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', person.email)
      .maybeSingle();

    let userId;
    if (existing) {
      console.log(`Already exists, skipping auth creation: ${person.email}`);
      userId = existing.id;
    } else {
      const randomPassword = crypto.randomBytes(24).toString('hex');
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: person.email,
        password: randomPassword,
        email_confirm: true, // no confirmation email sent
        user_metadata: { full_name: person.name, pending_migration: true }
      });
      if (createErr) {
        console.error(`FAILED creating auth user for ${person.email}:`, createErr.message);
        continue;
      }
      userId = created.user.id;

      const { error: insertErr } = await supabase.from('users').insert({
        id: userId,
        full_name: person.name,
        email: person.email,
        role_id: roleId,
        is_active: false,
        active: false
      });
      if (insertErr) {
        console.error(`FAILED inserting public.users row for ${person.email}:`, insertErr.message);
        continue;
      }
      console.log(`Created: ${person.name} <${person.email}> (${roleCode}) -> ${userId}`);
    }

    for (const legacyName of person.legacyNames) {
      results.push({ legacyName, userId, email: person.email });
    }
  }

  // Emit the SQL for the follow-up assigned_to backfill
  const esc = (s) => "'" + String(s).replace(/'/g, "''") + "'";
  const values = results.map(r => `(${esc(r.legacyName)}, ${esc(r.userId)})`).join(',\n  ');
  const sql = `-- Run this AFTER create_pending_users.cjs succeeds.
-- Links legacy tickets to the real (pending) accounts just created.
-- Disables the workflow trigger briefly since it blocks ANY update to an
-- APPROVED ticket, not just status changes (same issue as the product_id backfill).

ALTER TABLE public.tickets DISABLE TRIGGER ticket_workflow_trigger;

WITH mapping (legacy_name, user_id) AS (
  VALUES
  ${values}
)
UPDATE public.tickets t
SET assigned_to = m.user_id::uuid
FROM mapping m
WHERE t.legacy_assigned_to = m.legacy_name;

ALTER TABLE public.tickets ENABLE TRIGGER ticket_workflow_trigger;
`;
  require('fs').writeFileSync('backfill_assigned_to.sql', sql, 'utf-8');
  console.log('\nWrote backfill_assigned_to.sql - run it next in the SQL Editor.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
