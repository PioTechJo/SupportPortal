const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";

async function run() {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    const tRes = await fetch(`${SUPABASE_URL}/rest/v1/teams?select=id,team_name`, { headers });
    const teams = await tRes.json();
    console.log("Teams fetched:", teams.length);
    const bpmTeam = teams.find(t => t.team_name.includes('BPM')) || teams[0];
    
    if (bpmTeam) {
      console.log("Found team:", bpmTeam.team_name, bpmTeam.id);
      const rRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_team_developer_names`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ p_team_id: bpmTeam.id })
      });
      const devs = await rRes.json();
      console.log(`Developers for ${bpmTeam.team_name}:`);
      console.dir(devs, { depth: null });
    }
  } catch(e) { console.error(e); }
}
run();
