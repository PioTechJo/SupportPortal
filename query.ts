
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: audit } = await supabase.from('audit_log').select('*').limit(1);
  console.log('audit_log schema:', Object.keys(audit?.[0] || {}));
  const { data: statusHistory } = await supabase.from('ticket_status_history').select('*').limit(1);
  console.log('ticket_status_history schema:', Object.keys(statusHistory?.[0] || {}));
}
run();

