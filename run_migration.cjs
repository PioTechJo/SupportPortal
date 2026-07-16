const fs = require('fs');
const { execSync } = require('child_process');
const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'Tickets_-_2026-2025.xls');

function runQuery(query) {
  // Use a temporary file to avoid command line length limits or escaping issues
  const tempSqlFile = path.join(__dirname, 'temp_query.sql');
  fs.writeFileSync(tempSqlFile, query);
  try {
    const output = execSync(`npx supabase db query -f temp_query.sql --linked`, { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 10 });
    // Parse the JSON output if it contains 'rows'
    const match = output.match(/\{[\s\S]*"rows":[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]).rows;
    }
    return output;
  } catch (err) {
    console.error("Query execution error:", err.stdout || err.message);
    throw err;
  }
}

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

const excelToDate = (serial) => {
  if (!serial) return null;
  if (typeof serial === 'string') return new Date(serial).toISOString();
  return new Date(Math.round((serial - 25569) * 86400 * 1000)).toISOString();
};

async function main() {
  console.log("1. Adding LEGACY product...");
  const productRes = runQuery(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM public.products WHERE product_code = 'LEGACY') THEN
        INSERT INTO public.products (id, product_code, product_name, is_active) 
        VALUES (gen_random_uuid(), 'LEGACY', 'Legacy / Unspecified', false);
      END IF;
    END $$;
    SELECT id FROM public.products WHERE product_code = 'LEGACY';
  `);
  const legacyProductId = productRes[0].id;
  console.log("Legacy Product ID:", legacyProductId);

  console.log("2. Altering tickets table...");
  runQuery(`
    ALTER TABLE public.tickets 
    ADD COLUMN IF NOT EXISTS legacy_assigned_to text,
    ADD COLUMN IF NOT EXISTS legacy_ticket_id text;
  `);
  console.log("Columns added.");

  console.log("3. Fetching mappings (statuses, priorities, customers)...");
  const statuses = runQuery(`SELECT id, status_code FROM public.ticket_statuses`);
  const priorities = runQuery(`SELECT id, priority_code FROM public.priorities`);
  const customers = runQuery(`SELECT id, customer_name, customer_code FROM public.customers`);

  const statusMap = {};
  statuses.forEach(s => statusMap[s.status_code] = s.id);

  const priorityMap = {};
  priorities.forEach(p => priorityMap[p.priority_code] = p.id);

  const customerMap = {};
  customers.forEach(c => customerMap[(c.customer_name || '').trim().toLowerCase()] = c.id);
  // Specifically map Capital Bank
  const capitalBank = customers.find(c => c.customer_code === 'CAP' || c.customer_name === 'Capital Bank');
  if (capitalBank) {
    customerMap['capital bank of jordan (efb)'] = capitalBank.id;
    customerMap['capital bank'] = capitalBank.id;
  }

  const statusCrosswalk = {
    'Closed': 'APPROVED',
    'Group Queue': 'NEW',
    'Agent Queue': 'ASSIGNED',
    'Resolved': 'RESOLVED_PENDING_APPROVAL',
    'Notify customer': 'PENDING_CUSTOMER',
    'Customer': 'PENDING_CUSTOMER'
  };

  const severityMapping = {
    'High': 'HIGH',
    'Medium': 'MEDIUM',
    'Low': 'LOW'
  };

  const adminUser = "8066aa61-7985-4be8-92cc-490b0d3f4b95";

  console.log("4. Reading Excel file...");
  const workbook = xlsx.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: null });

  let validRows = [];
  let unmatchedCustomers = new Set();

  rawData.forEach(r => {
    let accountName = r['Account Name'] || '';
    if (accountName.includes('Jordan Trade Facilities Company') || accountName.includes('Soffront Acc')) {
      return; // Skip
    }

    // Remove parenthetical codes
    accountName = accountName.replace(/\s*\(.*?\)\s*/g, ' ').trim();

    let cleanName = accountName.toLowerCase();
    const manualOverrides = {
      'housing bank -bahrain': 'housing bank',
      'ziraat bank- iraq': 'ziraat bank- iraq',
      'al-taif islamic bank - iraq': 'al-taif islamic bank',
      'syria gulf bank -': 'syria gulf bank',
      'palestine investment bank': 'palestine investment bank (palestine)',
      'region trade bank -': 'region trade bank',
      'al-arabiya islamic bank -iraq': 'al-arabiya islamic bank',
      'zain cash -jordan': 'zain cash',
      'national bank of iraq -iraq': 'national bank of iraq',
      'jordan islamic bank -jordan': 'jordan islamic bank',
      'arab bank syria -syria': 'arab bank syria',
      'palestine investment bank - b': 'palestine investment bank (bahrain)',
      'banque bemo saudi fransi -syria': 'banque bemo saudi fransi',
      'capital bank -jordan': 'capital bank',
      'capital bank of jordan': 'capital bank',
      'alawneh exchange – jordan': 'alawneh exchange',
      'alawneh exchange - jordan': 'alawneh exchange'
    };

    if (manualOverrides[cleanName]) {
      cleanName = manualOverrides[cleanName];
    }

    const customerId = customerMap[cleanName];
    if (!customerId) {
      unmatchedCustomers.add(accountName);
    }

    const finalStatusName = statusCrosswalk[r['Status']] || 'NEW';
    const severity = r['Severity'] ? severityMapping[r['Severity']] : 'MEDIUM';
    
    let openedDate = excelToDate(r['Opened Date']);
    let closedDate = excelToDate(r['Closed']);
    
    if (finalStatusName === 'APPROVED') {
      if (!closedDate) closedDate = openedDate;
    } else {
      closedDate = null;
    }

    validRows.push({
      legacy_ticket_id: String(r['Ticket ID']),
      subject: r['Synopsis'],
      description: r['Problem Description'],
      resolution_justification: r['Solution'],
      created_at: openedDate,
      approved_at: closedDate,
      status_id: statusMap[finalStatusName],
      priority_id: priorityMap[severity || 'MEDIUM'],
      customer_id: customerId,
      legacy_assigned_to: r['Assigned To'],
      created_by: adminUser,
      product_id: legacyProductId
    });
  });

  if (unmatchedCustomers.size > 0) {
    console.error("WARNING: Unmatched customers found! Migration aborted before insert.", unmatchedCustomers);
    return;
  }

  console.log(`Ready to insert ${validRows.length} rows.`);

  const batchSize = 500;
  const numBatches = Math.ceil(validRows.length / batchSize);

  for (let i = 0; i < numBatches; i++) {
    const batch = validRows.slice(i * batchSize, (i + 1) * batchSize);
    
    let sql = `INSERT INTO public.tickets (
      legacy_ticket_id, subject, description, resolution_justification,
      created_at, approved_at, status_id, priority_id, customer_id,
      legacy_assigned_to, created_by, product_id
    ) VALUES \n`;

    const values = batch.map(row => {
      return `(
        ${escapeSql(row.legacy_ticket_id)},
        ${escapeSql(row.subject)},
        ${escapeSql(row.description)},
        ${escapeSql(row.resolution_justification)},
        ${escapeSql(row.created_at)}::timestamptz,
        ${row.approved_at ? escapeSql(row.approved_at) + '::timestamptz' : 'NULL'},
        ${escapeSql(row.status_id)}::uuid,
        ${escapeSql(row.priority_id)}::uuid,
        ${escapeSql(row.customer_id)}::uuid,
        ${escapeSql(row.legacy_assigned_to)},
        ${escapeSql(row.created_by)}::uuid,
        ${escapeSql(row.product_id)}::uuid
      )`;
    });

    sql += values.join(',\n') + ';';

    const batchFile = path.join(__dirname, `batch_${i + 1}.sql`);
    fs.writeFileSync(batchFile, sql);
    
    console.log(`Executing batch ${i + 1}/${numBatches}...`);
    try {
      execSync(`npx supabase db query -f batch_${i + 1}.sql --linked`, { encoding: 'utf-8' });
    } catch (e) {
      console.error(`Error in batch ${i + 1}:`, e.message);
      throw e;
    }
  }

  console.log("Batched inserts complete. Running verification queries...");

  const countQuery = runQuery(`SELECT COUNT(*) as count FROM public.tickets`);
  console.log(`Total tickets: ${countQuery[0].count}`);

  const statusQuery = runQuery(`
    SELECT ts.status_code, COUNT(t.id) as count 
    FROM public.tickets t 
    JOIN public.ticket_statuses ts ON t.status_id = ts.id 
    GROUP BY ts.status_code
  `);
  console.log(`Status distribution:`, statusQuery);

  const legacyCountQuery = runQuery(`SELECT COUNT(*) as count FROM public.tickets WHERE legacy_ticket_id IS NOT NULL`);
  console.log(`Legacy tickets count: ${legacyCountQuery[0].count}`);

  const nullCustomerQuery = runQuery(`SELECT COUNT(*) as count FROM public.tickets WHERE customer_id IS NULL`);
  console.log(`Null customer count: ${nullCustomerQuery[0].count}`);

  const duplicatesQuery = runQuery(`
    SELECT legacy_ticket_id, COUNT(*) as count 
    FROM public.tickets 
    WHERE legacy_ticket_id IS NOT NULL 
    GROUP BY legacy_ticket_id 
    HAVING COUNT(*) > 1
  `);
  console.log(`Duplicates count: ${duplicatesQuery.length ? duplicatesQuery.length : 0}`);

  const legacyProductCount = runQuery(`SELECT COUNT(*) as count FROM public.products WHERE product_code = 'LEGACY'`);
  console.log(`LEGACY product count: ${legacyProductCount[0].count}`);

  console.log("Migration complete!");
}

main().catch(console.error);
