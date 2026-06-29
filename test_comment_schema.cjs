const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";

async function run() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY
    }
  });
  const schema = await response.json();
  if (schema.definitions && schema.definitions.ticket_comments) {
    console.log(JSON.stringify(schema.definitions.ticket_comments, null, 2));
  } else if (schema.components && schema.components.schemas && schema.components.schemas.ticket_comments) {
    console.log(JSON.stringify(schema.components.schemas.ticket_comments, null, 2));
  } else {
    console.log("Not found in direct definitions, here are keys:", Object.keys(schema.definitions || schema.components?.schemas || {}));
  }
}
run();
