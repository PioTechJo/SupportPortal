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
    const { messages, product_id } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    let additionalContext = "";
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (product_id && supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        // Find last user message for search query
        const lastUserMessage = messages.filter((m: any) => m.role === 'user' || m.role === 'model').pop();
        // user messages might have role='user'
        const userMessages = messages.filter((m: any) => m.role === 'user');
        const lastUserText = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : "";
        
        if (lastUserText) {
          const { data, error } = await supabase.rpc('search_similar_resolved_tickets', {
            p_product_id: product_id,
            p_search_text: lastUserText,
            p_limit: 5
          });
          
          if (!error && data && data.length > 0) {
            additionalContext = "\n\nHere are similar past resolved issues from our knowledge base that may help guide your questions or suggestions:\n\n";
            data.forEach((t: any) => {
              additionalContext += `Similar past issue: ${t.subject} - Resolution: ${t.resolution_justification}\n`;
            });
            additionalContext += "\nUse this historical context if relevant, but continue asking clarifying questions as your primary role.";
          }
        }
      }
    } catch (ragError) {
      console.error("RAG fetch failed:", ragError);
    }

    let systemPrompt = "You are a friendly first-line assistant for Pio-Tech's banking support portal. A bank officer is describing a technical issue with systems like DWH, AML, goAML, BPM, RBA, T24, or OPICS. Ask 2-4 short clarifying questions one at a time to understand the problem clearly before they submit a support ticket. Keep questions simple and non-technical where possible, since the user may not be a technical expert. Do not try to solve the issue yourself - your job is only to help them describe it clearly for the support team.";
    if (additionalContext) {
      systemPrompt += additionalContext;
    }

    // Convert frontend messages (which might be in Gemini format) to Anthropic format
    const formattedMessages = messages.map((m: any) => ({
      role: m.role === 'model' ? 'assistant' : m.role, // Claude uses 'assistant' instead of 'model'
      content: m.content || m.parts?.[0]?.text || ""
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        system: systemPrompt,
        messages: formattedMessages,
        max_tokens: 1024
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    // Extract the text from the first content block of type "text"
    const replyText = data.content?.find((c: any) => c.type === "text")?.text || "Sorry, I couldn't process that.";

    return new Response(JSON.stringify({ reply: replyText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
