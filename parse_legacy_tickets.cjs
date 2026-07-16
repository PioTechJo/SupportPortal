const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'Tickets_-_2026-2025.xls');

try {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: null });
  
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

  const excelToDate = (serial) => {
    if (!serial) return null;
    if (typeof serial === 'string') return new Date(serial).toISOString();
    return new Date(Math.round((serial - 25569) * 86400 * 1000)).toISOString();
  };

  const mapRow = (r) => {
    const finalStatusName = statusCrosswalk[r['Status']] || 'NEW';
    const severity = r['Severity'] ? severityMapping[r['Severity']] : 'MEDIUM';
    
    let openedDate = excelToDate(r['Opened Date']);
    let closedDate = excelToDate(r['Closed']);
    
    // FIX BUG 1: Only populate approved_at if final status is APPROVED
    if (finalStatusName === 'APPROVED') {
      if (!closedDate) closedDate = openedDate; // Fallback
    } else {
      closedDate = null;
    }

    let accountName = r['Account Name'] || '';
    if (accountName === 'Capital Bank of Jordan (EFB)') {
      accountName = 'Capital Bank';
    } else {
      accountName = accountName.replace(/\s*\(.*?\)\s*/g, ' ').trim();
    }

    return {
      legacy_ticket_id: String(r['Ticket ID']),
      subject: r['Synopsis'],
      description: r['Problem Description'],
      resolution_justification: r['Solution'],
      created_at: openedDate,
      approved_at: closedDate,
      status_id: `UUID-FOR-${finalStatusName}`,
      priority_id: `UUID-FOR-${severity || 'MEDIUM'}`,
      customer_id: `UUID-FOR-BANK(${accountName})`,
      legacy_assigned_to: r['Assigned To'],
      created_by: "8066aa61-7985-4be8-92cc-490b0d3f4b95",
      product_id: "UUID-FOR-LEGACY-PRODUCT"
    };
  };

  const sampleRow = rawData.find(row => String(row['Ticket ID']) === '17731');

  console.log('RAW ROW (selected fields):');
  console.log(JSON.stringify({
    'Ticket ID': sampleRow['Ticket ID'],
    'Current Status': sampleRow['Current Status'],
    'Status': sampleRow['Status'],
    'Severity': sampleRow['Severity'],
    'Due Date': sampleRow['Due Date']
  }, null, 2));

  console.log('\nMAPPED ROW:');
  console.log(JSON.stringify(mapRow(sampleRow), null, 2));

} catch (err) {
  console.error(err);
}
