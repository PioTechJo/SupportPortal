const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'agent@piotech.com',
    password: 'password'
  });
  
  if (authError || !authData.user) {
    console.log("Could not login as agent@piotech.com, trying admin@piotech.com...");
    const { data: authData2, error: authError2 } = await supabase.auth.signInWithPassword({
      email: 'admin@piotech.com',
      password: 'password'
    });
    if (authError2 || !authData2.user) {
       console.error("Login failed completely", authError2);
       return;
    }
    authData.user = authData2.user;
  }
  
  const authUserId = authData.user.id;
  
  const { data: rawData, error: rawError } = await supabase
    .from('users')
    .select('*, roles(*)')
    .eq('id', authUserId)
    .single();
    
  console.log("===== RESULT FROM: supabase.from('users').select('*, roles(*)').eq('id', auth.user.id).single() =====");
  console.log(JSON.stringify({ data: rawData, error: rawError }, null, 2));

  const { data: profileData } = await supabase
    .from('users')
    .select(`*, roles(role_name), customers(customer_name)`)
    .eq('id', authUserId)
    .maybeSingle();

  let finalProfile = null;
  if (profileData) {
    const p = profileData;
    let finalRoleName = p.role_name || p.role;
    if (p.roles) {
      if (Array.isArray(p.roles) && p.roles.length > 0 && p.roles[0].role_name) {
        finalRoleName = p.roles[0].role_name;
      } else if (!Array.isArray(p.roles) && p.roles.role_name) {
        finalRoleName = p.roles.role_name;
      }
    }
    
    finalProfile = {
      ...p,
      role_name: finalRoleName,
      customer_name: p.customers?.customer_name || null
    };
    delete finalProfile.roles;
    delete finalProfile.customers;
  }

  console.log("\n===== EXACT RUNTIME JSON RETURNED BY api.getProfile() =====");
  console.log(JSON.stringify(finalProfile, null, 2));
  
  console.log("\n===== EXACT FIELD VALUES =====");
  console.log(`profile.role_id: ${finalProfile?.role_id}`);
  console.log(`profile.role_name: ${finalProfile?.role_name}`);
  console.log(`profile.roles: ${JSON.stringify(profileData?.roles)}`);
}

run();
