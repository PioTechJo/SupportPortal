const { execSync } = require('child_process');
const fs = require('fs');

function runQuery(query) {
  fs.writeFileSync('temp_query2.sql', query);
  const output = execSync(`npx supabase db query -f temp_query2.sql --linked`, { encoding: 'utf-8' });
  const match = output.match(/\{[\s\S]*"rows":[\s\S]*\}/);
  if (match) return JSON.parse(match[0]).rows;
  return output;
}

try {
  const customers = runQuery(`SELECT customer_name FROM public.customers`);
  fs.writeFileSync('db_customers.json', JSON.stringify(customers, null, 2));
  console.log("Saved to db_customers.json");
} catch (e) {
  console.error(e.message);
}
