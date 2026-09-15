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
    const { question } = await req.json();
    if (!question) throw new Error("Question is required");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "User authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Missing required environment variables");
    }

    // Step 1: Ask Claude to generate the SQL query. Scoped to a bank's own
    // ticket data - no internal-only tables (users, teams, escalations) are
    // mentioned, since a bank user has no legitimate reason to query them.
    const schemaDescription = `
You are a PostgreSQL expert. Your task is to write a single SELECT query to answer a bank customer's question about their own support tickets, based on the following schema:

TABLES:
- tickets (id, ticket_no, subject, description, status_id, priority_id, customer_id, product_id, created_at, closed_at, sla_due_date, ticket_type)
- ticket_statuses (status_code, status_name)
- priorities (priority_name)
- products (product_name, product_code)
- maintenance_contracts (customer_id, product_id, fiscal_year, start_date, end_date, project_code)

CRITICAL RELATIONSHIPS (FOREIGN KEYS):
- tickets.product_id = products.id
- tickets.status_id = ticket_statuses.id
- tickets.priority_id = priorities.id
- maintenance_contracts.product_id = products.id

GENERAL RULES:
1. ONLY use standard PostgreSQL SELECT statements.
2. DO NOT use INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, etc.
3. Do NOT reference any table other than the ones listed above - the caller only has access to their own bank's rows in them anyway.
4. Return ONLY the raw SQL string. Do not wrap it in markdown code blocks (\`\`\`sql ... \`\`\`). No explanations, no preambles. Just the SQL.

FEW-SHOT EXAMPLES:
Question: "How many open tickets do we have?"
SQL: SELECT COUNT(*) FROM tickets t JOIN ticket_statuses s ON t.status_id = s.id WHERE s.status_code NOT IN ('CLOSED', 'APPROVED');

Question: "What's our oldest unresolved ticket?"
SQL: SELECT ticket_no, subject, created_at FROM tickets t JOIN ticket_statuses s ON t.status_id = s.id WHERE s.status_code NOT IN ('CLOSED', 'APPROVED') ORDER BY created_at ASC LIMIT 1;
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
        max_tokens: 1024,
      }),
    });

    const sqlData = await sqlGenerationResponse.json();
    if (sqlData.error) {
      throw new Error("Failed to generate SQL: " + sqlData.error.message);
    }

    let generatedSql = sqlData.content?.find((c: any) => c.type === "text")?.text || "";

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

    // Step 2: Execute the query AS THE CALLING USER (their own JWT, not the
    // service role) so the existing RLS policies on these tables - which
    // already restrict a bank user to their own customer_id - apply for
    // real, regardless of what the AI-generated SQL says.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: queryResult, error: queryError } = await supabase.rpc("execute_readonly_query_scoped", {
      p_query: generatedSql,
    });

    if (queryError) {
      console.error("SQL Execution Error:", queryError);
      return new Response(JSON.stringify({
        error: "Sorry, I couldn't run that query. Please try rephrasing your question.",
        details: queryError.message,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Ask Claude to summarize the result
    const summaryPrompt = `
You are a helpful data assistant for a bank customer using a support portal.
The user asked a question about their own support tickets. We ran an SQL query to get the answer.
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
          { role: "user", content: `Question: ${question}\n\nData result: ${JSON.stringify(queryResult)}` },
        ],
        max_tokens: 1024,
      }),
    });

    const summaryData = await summaryResponse.json();
    if (summaryData.error) {
      throw new Error("Failed to summarize: " + summaryData.error.message);
    }

    const answer = summaryData.content?.find((c: any) => c.type === "text")?.text || "No answer generated.";

    return new Response(JSON.stringify({ answer }), {
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
