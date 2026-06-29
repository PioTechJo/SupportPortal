import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('users').select('*, roles(role_name)').eq('email', 'haitham.m.n@gmail.com').maybeSingle();
  
  let roleNameVal = undefined;
  if (data?.roles) {
    if (Array.isArray(data.roles) && data.roles.length > 0) {
      roleNameVal = data.roles[0].role_name;
    } else if (!Array.isArray(data.roles)) {
      roleNameVal = (data.roles as any).role_name;
    }
  }

  const finalRoleName = roleNameVal || data?.role || 'cab_user';

  console.log("1. The exact value of users.role_id: " + data?.role_id);
  console.log("2. The exact value of roles.role_name returned from Supabase: " + roleNameVal);
  console.log("3. The exact value stored in userProfile.roleName: " + finalRoleName);
  console.log("4. The exact file and line rendering the CAB_USER badge: src/components/AppLayout.tsx line 122");
  console.log("5. The exact expression used to generate the badge text: {user?.role}");
}

run();
