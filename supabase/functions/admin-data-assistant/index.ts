import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { question, user_id } = await req.json();
    if (!question) throw new Error("Question is required");
    if (!user_id) {
      return new Response(JSON.stringify({ error: "User authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    // Step 1: Ask Claude to generate the SQL query
    const schemaDescription = `
You are a PostgreSQL expert. Your task is to write a single SELECT query to answer the user's question based on the following schema:

TABLES:
- tickets (id, ticket_no, subject, status_id, priority_id, customer_id, product_id, assigned_to, created_at, closed_at, sla_due_date, diagnostic_score)
- ticket_statuses (status_code, status_name)
- priorities (priority_name)
- customers (customer_name, is_internal)
- products (product_name, product_code)
- users (id, full_name, email, role_id)
- roles (role_code, role_name)
- maintenance_contracts (customer_id, product_id, fiscal_year, start_date, end_date)
- team_members (user_id, team_id)
- teams (team_name)
- ticket_comments (ticket_id, is_internal, escalated_team_id, escalated_developer_name, escalation_returned_at)
- system_settings (setting_key, setting_value)

CRITICAL RELATIONSHIPS (FOREIGN KEYS):
- tickets.customer_id = customers.id (The bank/customer that created or owns the ticket)
- tickets.product_id = products.id
- tickets.assigned_to = users.id (The engineer responsible for resolving the ticket - NOT the bank)
- tickets.status_id = ticket_statuses.id
- tickets.priority_id = priorities.id
- ticket_comments.escalated_team_id = teams.id (When escalated to an external team)

CRITICAL RULES FOR NAMES:
1. Bank/Customer names are ONLY in customers.customer_name. If asked about a bank/customer, ALWAYS join tickets with customers via tickets.customer_id = customers.id. NEVER search for banks in the users table.
2. Engineer names are ONLY in users.full_name. If asked about an engineer, ALWAYS join tickets with users via tickets.assigned_to = users.id.
3. ALWAYS use ILIKE '%name%' for partial matching of banks or engineers, as users may provide incomplete names (e.g., 'Safwa' instead of 'Safwa Islamic Bank').

GENERAL RULES:
1. ONLY use standard PostgreSQL SELECT statements.
2. DO NOT use INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, etc.
3. Return ONLY the raw SQL string. Do not wrap it in markdown code blocks (\`\`\`sql ... \`\`\`). No explanations, no preambles. Just the SQL.

FEW-SHOT EXAMPLES:
Question: "How many tickets did bank X create?"
SQL: SELECT COUNT(*) FROM tickets t JOIN customers c ON t.customer_id = c.id WHERE c.customer_name ILIKE '%X%';

Question: "How many tickets did engineer X resolve?"
SQL: SELECT COUNT(*) FROM tickets t JOIN users u ON t.assigned_to = u.id WHERE u.full_name ILIKE '%X%' AND t.status_id = 'CLOSED';
    `;

    const sqlGenerationResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        system: schemaDescription,
        messages: [{ role: "user", content: question }],
        max_tokens: 1024
      }),
    });

    const sqlData = await sqlGenerationResponse.json();
    if (sqlData.error) {
      throw new Error("Failed to generate SQL: " + sqlData.error.message);
    }

    let generatedSql = sqlData.content?.find((c: any) => c.type === "text")?.text || "";
    
    // Clean the SQL string just in case Claude ignored the instructions
    generatedSql = generatedSql.trim();
    if (generatedSql.startsWith("```sql")) {
      generatedSql = generatedSql.substring(6);
    } else if (generatedSql.startsWith("```")) {
      generatedSql = generatedSql.substring(3);
    }
    if (generatedSql.endsWith("```")) {
      generatedSql = generatedSql.substring(0, generatedSql.length - 3);
    }
    generatedSql = generatedSql.trim();

    if (!generatedSql) {
      throw new Error("Could not generate a valid SQL query.");
    }

    // Step 2: Execute the query
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: queryResult, error: queryError } = await supabase.rpc("execute_readonly_query", {
      p_query: generatedSql,
      p_user_id: user_id
    });

    if (queryError) {
      console.error("SQL Execution Error:", queryError);
      return new Response(JSON.stringify({ 
        error: "?? ????? ????? ????? ???????? ????? ???? ????? ??????",
        details: queryError.message 
      }), {
        status: 200, // Return 200 so UI can display graceful error
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Ask Claude to summarize the result
    const summaryPrompt = `
You are a helpful data assistant for an administrator. 
The user asked a question about their system data. We ran an SQL query to get the answer.
Your task is to provide a clear, concise, and natural language answer based ONLY on the provided JSON data.
Answer in the same language as the user's question (e.g. Arabic or English).
DO NOT show the SQL query. DO NOT mention the JSON format. Just give the answer.
    `;

    const summaryResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        system: summaryPrompt,
        messages: [
          { role: "user", content: `Question: ${question}\n\nData result: ${JSON.stringify(queryResult)}` }
        ],
        max_tokens: 1024
      }),
    });

    const summaryData = await summaryResponse.json();
    if (summaryData.error) {
      throw new Error("Failed to summarize: " + summaryData.error.message);
    }

    const answer = summaryData.content?.find((c: any) => c.type === "text")?.text || "No answer generated.";

    return new Response(JSON.stringify({ 
      answer, 
      query_used: generatedSql 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Edge Function Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
