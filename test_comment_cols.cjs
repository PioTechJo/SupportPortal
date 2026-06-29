const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";

async function run() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_ANON_KEY}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY
    }
  });
  const schema = await response.json();
  const tables = schema.definitions || (schema.components && schema.components.schemas);
  if (tables) {
    const tComment = tables.ticket_comments || tables.ticket_comment;
    if (tComment) {
      console.log("ticket_comments columns:", Object.keys(tComment.properties || {}));
      console.log("Full properties:", JSON.stringify(tComment.properties, null, 2));
    } else {
      console.log("Available tables:", Object.keys(tables));
    }
  } else {
    console.log("No definitions or components schemas found. Keys:", Object.keys(schema));
  }
}
run();
