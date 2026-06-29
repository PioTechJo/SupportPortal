const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log("Signing in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'haitham.m.n@gmail.com',
    password: 'password'
  });
  if (authError) {
    console.error("Sign in failed:", authError);
    return;
  }
  console.log("Sign in successful! User ID:", authData.user.id);

  console.log("Querying roles...");
  const { data: roles, error: rolesError } = await supabase.from('roles').select('*');
  console.log("Roles:", roles, "Error:", rolesError);

  console.log("Querying customers...");
  const { data: customers, error: customersError } = await supabase.from('customers').select('*');
  console.log("Customers:", customers, "Error:", customersError);
  
  console.log("Querying users...");
  const { data: users, error: usersError } = await supabase.from('users').select('*');
  console.log("Users count:", users ? users.length : 0, "Error:", usersError);
  if (users && users.length > 0) {
    console.log("Users:", JSON.stringify(users, null, 2));
  }
}
run();
