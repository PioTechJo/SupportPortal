// Self-service troubleshooting checks shown per product before a Support ticket
// is submitted. Source: "Most repeated issues and client self-service
// recommendations". Keys are matched against products.product_name via
// getSelfServiceGuide() (case/space-insensitive).

export interface SelfServiceItem {
  issue: string;
  resolution: string;
}

export interface SelfServiceGuide {
  items: SelfServiceItem[];
  preventive?: string;
}

const GUIDES: Record<string, SelfServiceGuide> = {
  'bankbi-fatca': {
    items: [
      { issue: 'Delayed or missing watchlist names', resolution: 'Verify that the name has been added correctly in the Core Banking system. Check the last watchlist synchronization date and the scheduled daily update time.' },
      { issue: 'Screening results not appearing', resolution: 'Verify the customer name, list selection, screening status and configured matching score. Test using a known sample name.' },
      { issue: 'Incorrect screening score', resolution: 'Review the approved screening threshold and confirm that the requested score is being used. Escalate changes requiring administrator access.' },
      { issue: 'Reports returning empty results', resolution: 'Verify the report date range, filters and whether records exist within the selected period. Try a wider date range.' },
      { issue: 'FATCA data missing from reports', resolution: 'Compare the available customer information with the source system and identify missing fields. Provide sample records for investigation.' },
    ],
  },
  'bankbi-rba': {
    items: [
      { issue: 'Incorrect customer risk classification', resolution: 'Review customer information, including nationality, address, PEP status, legal form and business activity. Confirm that the source information is accurate.' },
      { issue: 'Risk score discrepancies', resolution: 'Review the configured RBA matrix and compare the individual risk factors with the final classification.' },
      { issue: 'Missing or outdated risk information', resolution: 'Verify that customer profile information has been updated in the Core Banking system.' },
      { issue: 'RBA report generation requests', resolution: 'Use the available report-generation functionality and verify the reporting month and selected criteria.' },
      { issue: 'Unexpected changes in risk classification', resolution: "Compare the customer's previous and current profile information to identify changes affecting the calculated risk score." },
    ],
  },
  'bankbi-profitability': {
    items: [
      { issue: 'Missing GLs in profitability reports', resolution: 'Review the GL accounts included in the approved mapping list and identify newly introduced or unmapped GLs.' },
      { issue: 'Incorrect profit outstanding figures', resolution: 'Compare the reported figures with the corresponding Core Banking figures and identify the affected accounts and reporting dates.' },
      { issue: 'Missing customer or account information', resolution: 'Verify that the customer and account are assigned to the correct organizational unit and have the required source information.' },
      { issue: 'Incorrect profitability results', resolution: 'Compare the selected reporting period, product classification and account information with the expected results.' },
      { issue: 'Profitability engine not producing updated results', resolution: 'Check the last successful processing date and report any execution errors to the support team.' },
    ],
    preventive: 'Maintain an updated GL mapping register and perform monthly reconciliation between profitability reports and Core Banking figures.',
  },
  'sap-etl': {
    items: [
      { issue: 'ETL jobs failing', resolution: 'Check the job execution status, failure timestamp and complete error message through the ETL monitoring interface.' },
      { issue: 'ETL jobs not running on schedule', resolution: 'Verify that the scheduled task is enabled and that the expected execution time has passed.' },
      { issue: 'Database connection or account-lock issues', resolution: 'Ask the DBA to verify the configured service account status and connectivity.' },
      { issue: 'Missing data after ETL execution', resolution: 'Compare the last successful processing date with the missing business date and verify whether the source data is available.' },
      { issue: 'Duplicate records preventing execution', resolution: 'Ask the Core Banking/data owner to investigate duplicate source records and correct them through the approved process.' },
      { issue: 'ETL server resource or disk-space issues', resolution: 'Check available disk space and server resource utilization with the Infrastructure team.' },
    ],
  },
  'bankbi-aml': {
    items: [
      { issue: 'Missing alerts', resolution: 'Verify the date range, alert filters, scenario activation status and availability of the related customer/transaction data.' },
      { issue: 'Screening results missing from alerts', resolution: 'Check the screening status and verify whether the relevant screening process completed successfully.' },
      { issue: 'Incorrect or unexpected alerts', resolution: 'Review the scenario name, business criteria and customer information. Provide examples of expected versus actual results.' },
      { issue: 'Watchlist synchronization problems', resolution: 'Verify the list status, last update date and whether the required names exist in the source list.' },
      { issue: 'Alerts not appearing in Case Management', resolution: 'Search using the alert ID, customer reference and all available workflow statuses. Verify user permissions.' },
      { issue: 'Incorrect customer risk classification', resolution: 'Validate the customer profile information and the applicable risk classification criteria.' },
      { issue: 'AML reports containing missing or incorrect data', resolution: 'Verify report filters, dates, sample customer records and the expected fields.' },
      { issue: 'Scenario configuration issues', resolution: 'Review the visible scenario and rule status. Do not modify thresholds or parameters without approval.' },
    ],
  },
  'bankbi-rr': {
    items: [
      { issue: 'Reports not refreshing', resolution: 'Verify the selected reporting date, report parameters and whether the latest data is available.' },
      { issue: 'Reports returning empty results', resolution: 'Check the reporting period, filters and user access. Test with a period containing known transactions.' },
      { issue: 'Report execution failures', resolution: 'Capture the complete error message and identify whether the issue affects one report or all reports.' },
      { issue: 'Database connection problems', resolution: 'Ask the Infrastructure/DBA team to verify database availability and connectivity.' },
      { issue: 'Differences between old and new environments', resolution: 'Compare the reporting parameters, data availability and environment configuration.' },
    ],
  },
  'bankbi-dwh': {
    items: [
      { issue: 'Missing or outdated DWH data', resolution: 'Check the last successful ETL execution date and identify the affected tables or reporting dates through available monitoring screens.' },
      { issue: 'Incorrect data in DWH reports', resolution: 'Compare sample records against the source banking system and identify the exact fields containing discrepancies.' },
      { issue: 'ETL execution failures', resolution: 'Review the execution log and capture the complete error message. Check whether the source database is accessible.' },
      { issue: 'DWH storage utilization increasing', resolution: 'Ask the Infrastructure/DBA team to monitor storage utilization and review the approved historical data retention policy.' },
      { issue: 'Missing columns or tables', resolution: 'Verify whether the requested fields are part of the approved DWH scope and existing data mappings.' },
      { issue: 'Delayed reporting data', resolution: 'Verify whether the daily data-loading process has completed before refreshing the reports.' },
    ],
    preventive: 'Establish daily DWH data freshness monitoring and a monthly storage-capacity review.',
  },
  'oraclelicense': {
    items: [
      { issue: 'License activation issues', resolution: 'Verify the installed license status and expiration information with the authorized Oracle administrator.' },
      { issue: 'DR environment license requirements', resolution: 'Confirm whether the DR environment requires a separate license or is covered by the existing agreement.' },
      { issue: 'License-related job failures', resolution: 'Capture the exact error message and verify whether it explicitly identifies a licensing restriction.' },
      { issue: 'New server deployment', resolution: 'Confirm the applicable Oracle licensing requirements before installation or migration.' },
    ],
    preventive: 'Maintain a central register of Oracle licenses, environments, expiration dates and DR licensing requirements.',
  },
  'bankbi-fundtransferpricin(ftp)': {
    items: [
      { issue: 'Incorrect FTP results', resolution: 'Verify the selected reporting period, product and account classification.' },
      { issue: 'Missing accounts in FTP reports', resolution: 'Confirm that the accounts are active and classified under the correct product.' },
      { issue: 'Incorrect transfer pricing rates', resolution: 'Review the approved FTP rate configuration and effective dates.' },
      { issue: 'Missing or outdated FTP results', resolution: 'Verify the last successful processing date and report execution status.' },
    ],
    preventive: 'Perform monthly reconciliation of FTP results and maintain an approved register of applicable pricing rates.',
  },
  'sap-bo': {
    items: [
      { issue: 'Scheduled reports failing', resolution: 'Open CMC → Instance Manager and review the status of failed or pending report instances.' },
      { issue: 'Reports showing partial results', resolution: 'Check report filters and retrieval limits. Verify whether the report is expected to return more records than the configured limit.' },
      { issue: 'Reports not refreshing', resolution: 'Verify the report parameters and database connection availability.' },
      { issue: 'SAP BO services unavailable', resolution: 'Ask the authorized IT team to verify that the required BI services are running.' },
      { issue: 'Report access or authorization issues', resolution: "Verify the user's assigned groups, folders and report permissions." },
      { issue: 'Reports taking too long to execute', resolution: 'Reduce the reporting date range and unnecessary filters, then test the report again.' },
    ],
    preventive: "Train the client's reporting team to monitor failed report instances and re-execute eligible reports through CMC Instance Manager.",
  },
  'bankbi-crs': {
    items: [
      { issue: 'CRS reports generated empty', resolution: 'Verify the reporting date, customer eligibility and availability of source data.' },
      { issue: 'Monthly CRS report generation problems', resolution: 'Confirm that the correct reporting period and reporting criteria have been selected.' },
      { issue: 'Missing customer information', resolution: 'Compare the required customer fields against the Core Banking records.' },
      { issue: 'CRS data not updated', resolution: 'Verify the last successful ETL execution and whether the latest data has reached the reporting environment.' },
      { issue: 'New data requirements', resolution: 'Identify the missing tables or fields and confirm whether they are included in the existing DWH mapping scope.' },
    ],
    preventive: 'Perform a monthly CRS validation before submission, including record counts, mandatory fields and reconciliation with source data.',
  },
  'bankbi-mis': {
    items: [
      { issue: 'Reports showing outdated data', resolution: 'Verify the last successful data fill date before refreshing the reports.' },
      { issue: 'Reports returning empty results', resolution: 'Review the selected reporting period and organizational filters.' },
      { issue: 'Incorrect report results', resolution: 'Compare the affected figures with the corresponding source data and identify sample records.' },
      { issue: 'Scheduled reports not generated', resolution: 'Check the report scheduling status and failed instances through the available monitoring tools.' },
      { issue: 'Reports not accessible', resolution: "Verify the user's access rights and application availability." },
    ],
    preventive: 'Establish a daily MIS reporting checklist to confirm data availability, report execution and successful refresh.',
  },
  'bankbi-riskassessment': {
    items: [
      { issue: 'Incorrect customer risk assessment', resolution: 'Verify customer profile information and ensure that all required risk attributes are available.' },
      { issue: 'Risk classification discrepancies', resolution: 'Review the applicable risk criteria and compare the displayed classification with the approved methodology.' },
      { issue: 'Missing risk information', resolution: 'Check whether the required customer information has been completed in the source system.' },
      { issue: 'Unexpected changes in risk scores', resolution: 'Review changes to customer attributes and the effective date of the applicable risk criteria.' },
      { issue: 'Risk assessment reports showing incomplete data', resolution: 'Verify the reporting period, customer selection and report filters.' },
    ],
    preventive: 'Perform periodic customer risk-profile reviews and maintain an approved record of risk classification criteria and changes.',
  },
  'bankbi-creditbureau': {
    items: [
      { issue: 'Collateral validation errors', resolution: 'Review the collateral information in Core Banking and verify that the required customer, contract and collateral references are available.' },
      { issue: 'Customers appearing incorrectly in reports', resolution: 'Confirm whether the customer has active facilities in the Core Banking system and verify the facility status.' },
      { issue: 'Missing or incorrect report fields', resolution: 'Check the source customer/account information and identify the exact missing fields.' },
      { issue: 'Incorrect classifications or mappings', resolution: 'Review the approved economic sector, industry and collateral classifications.' },
      { issue: 'Report data not updated', resolution: 'Verify the reporting date and confirm that the relevant data-loading process has completed.' },
      { issue: 'Differences between Credit Bureau and Core Banking reports', resolution: 'Compare the same customer, facility, contract and reporting date across both systems.' },
    ],
  },
  'bankbi-goaml': {
    items: [
      { issue: 'CTR reports failing approval', resolution: 'Verify mandatory fields, transaction references and report validation messages before submitting for approval.' },
      { issue: 'Reports stuck in workflow', resolution: 'Review the current workflow status, pending approval stage and assigned user permissions.' },
      { issue: 'Missing transaction references', resolution: 'Verify that the relevant transaction information is available in the source system and report the affected references.' },
      { issue: 'GOAML performance issues', resolution: 'Record the affected screen, execution time and duration. Ask IT to check application server resources and service availability.' },
      { issue: 'Integration or connectivity failures', resolution: 'Ask IT to verify network connectivity, firewall/proxy access, DNS and SSL certificate validity.' },
      { issue: 'Missing or incomplete report information', resolution: 'Compare the report data with the original transaction and customer records.' },
      { issue: 'Users unable to approve reports', resolution: "Verify the user's assigned role and approval permissions." },
    ],
  },
};

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '');

export const getSelfServiceGuide = (productName: string): SelfServiceGuide | null => {
  if (!productName) return null;
  return GUIDES[normalize(productName)] ?? null;
};
