const fs = require('fs');
const content = fs.readFileSync('src/lib/api.ts', 'utf8');
const index = content.indexOf('async getTicketsPaginated');
if (index > -1) {
  const newContent = content.slice(0, index) + `  async getDashboardAnalytics(fromDate: string, toDate: string, customerIds: string[], engineerIds: string[]): Promise<any> {
    return safeExecute(async () => {
      const { data, error } = await supabase.rpc('get_dashboard_analytics', {
        p_from_date: fromDate,
        p_to_date: toDate,
        p_customer_ids: customerIds || [],
        p_engineer_ids: engineerIds || []
      });
      if (error) throw error;
      return data;
    });
  },

` + content.slice(index);
  fs.writeFileSync('src/lib/api.ts', newContent);
  console.log('Successfully added getDashboardAnalytics');
} else {
  console.log('Could not find getTicketsPaginated');
}
