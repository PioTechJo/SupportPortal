const { execSync } = require('child_process');

const query = `
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'tickets' 
  ORDER BY ordinal_position;
`;

const fs = require('fs');
fs.writeFileSync('temp_schema_query.sql', query);
try {
  const output = execSync('npx supabase db query -f temp_schema_query.sql --linked', { encoding: 'utf-8' });
  console.log(output);
} catch (e) {
  console.error(e.message);
}
