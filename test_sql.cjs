const { createClient } = require('@supabase/supabase-js');

async function getProc() {
  const url = "https://ybacrvdkbgljdykdogpz.supabase.co/rest/v1/rpc/get_function_source";
  // actually we can't do this easily. Let's just create a test_sql.cjs that uses postgres connection or just use REST API to call it
}
