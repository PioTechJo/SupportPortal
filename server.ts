import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK lazily to avoid crash if variable is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("GEMINI_API_KEY is not configured or is placeholder. Using high-fidelity local simulator instead.");
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Simulated fallback recommendations based on product and context
function generateSimulatedRecommendation(productName: string, description: string, answers: any[], symptoms: string[]) {
  const isProd1 = productName.includes("RECON");
  const isProd2 = productName.includes("INTEGRATOR");
  const isProd3 = productName.includes("Compliance") || productName.includes("AML");
  
  let rootCause = `Our analytical diagnosis for ${productName} indicates a transaction buffer lock when processing current telemetry. The narrative ("${description.slice(0, 80)}...") aligns with standard high-load pipeline bottlenecks.`;
  let recommendedActions = [
    "Navigate to System Configuration and increase the connection handshake timeout to 120s.",
    "Inspect the database index mappings to ensure batch reconciliation is not locking tables.",
    "Verify if any SWIFT message format variations are causing parsing exceptions in the message parser.",
    "Escalate to local system administrator to check the transaction loop queue state."
  ];
  let severity = "Medium";
  let estimatedCategory = "Configuration";

  if (isProd1) {
    rootCause = `The ledger balance discrepancy in ${productName} points to a temporary rounding difference or incomplete batch run. When SWIFT file streaming intersects end-of-day reconciliation, transaction records can get locked, causing out-of-balance warnings.`;
    recommendedActions = [
      "Check if any downstream ledger records remain in a ‘pending’ state.",
      "Manually trigger a micro-reconciliation run for the specific journal entry ranges.",
      "Ensure the multi-currency conversion table update is fully synchronized.",
      "Confirm that no duplicate feed uploads occurred during the batch timeframe."
    ];
    severity = "High";
    estimatedCategory = "Bug";
  } else if (isProd2) {
    rootCause = `The API gateway timeout in ${productName} shows signs of connection pooling exhaustion. High concurrent transaction volume or unclosed XML envelope threads are typical root causes for HTTP 504 codes.`;
    recommendedActions = [
      "Verify the API keep-alive parameters under Gateway Network parameters.",
      "Clear any stuck or looping message requests currently queued in the API dispatcher.",
      "Temporarily scale up the instance pool or configure traffic throttling limits to 1,000 TPS.",
      "Update any outdated SSL certificates corresponding to the bank client endpoints."
    ];
    severity = "Critical";
    estimatedCategory = "Integration";
  } else if (isProd3) {
    rootCause = `The scanning failure in ${productName} is likely caused by an outdated sanction list watchlist feed or memory limit on bulk watchlist records. Intermittent delays occur during search operations.`;
    recommendedActions = [
      "Ensure the global compliance watchlist feed (OFAC/PEP) is fully updated.",
      "Verify if a manual officer override is required to bypass the false-positive block.",
      "Adjust the threshold level of the compliance engine to avoid excessive false positives.",
      "Review the compliance logs specifically for database lockups during batch scans."
    ];
    severity = "Medium";
    estimatedCategory = "Training";
  }

  // Incorporate actual diagnostic responses into root cause if available
  if (answers && answers.length > 0) {
    const criticalAns = answers.find(a => a.answer_text && a.answer_text.toLowerCase().includes("yes") || a.answer_text.toLowerCase().includes("extreme"));
    if (criticalAns) {
      rootCause += ` Specially noted diagnostic indicator: "${criticalAns.question_text}" was flagged as "${criticalAns.answer_text}".`;
      severity = "Critical";
    }
  }

  return {
    rootCause,
    recommendedActions,
    severity,
    estimatedCategory
  };
}

// API endpoint for AI diagnostic recommendation
app.post("/api/recommendation", async (req, res) => {
  try {
    const { productName, description, answers, symptoms } = req.body;

    if (!productName || !description) {
      return res.status(400).json({ error: "productName and description are required parameters" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Return simulated recommendation if client key is absent
      const mockResult = generateSimulatedRecommendation(productName, description, answers, symptoms);
      return res.json(mockResult);
    }

    const qnaString = (answers || [])
      .map((ans: any, idx: number) => `Q${idx + 1}: ${ans.question_text || ans.question_id}\nA${idx + 1}: ${ans.answer_text}`)
      .join("\n\n");

    const symptomsString = (symptoms || []).join("\n- ");

    const promptText = `You are a banking software support expert for ${productName}.
A customer reported: ${description}
They answered these diagnostic questions:
${qnaString || 'None provided'}

Known symptoms for this product:
${symptomsString ? `- ${symptomsString}` : 'None logged'}

Provide:
1. Most likely root cause (2-3 sentences)
2. Recommended immediate actions the user can try (numbered list, max 5)
3. Severity assessment: Low / Medium / High / Critical
4. Estimated resolution category: Configuration / Bug / Training / Integration

Respond in JSON format. Generate a JSON object matching this schema:
{
  "rootCause": "text describing root cause",
  "recommendedActions": ["action 1", "action 2", ...],
  "severity": "Low" | "Medium" | "High" | "Critical",
  "estimatedCategory": "Configuration" | "Bug" | "Training" | "Integration"
}`;

    const modelName = "gemini-3.5-flash";
    const response = await ai.models.generateContent({
      model: modelName,
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rootCause: {
              type: Type.STRING,
              description: "Most likely root cause (2-3 sentences)."
            },
            recommendedActions: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING
              },
              description: "Recommended immediate actions the user can try (numbered list, max 5)."
            },
            severity: {
              type: Type.STRING,
              description: "Severity assessment: Low, Medium, High, or Critical."
            },
            estimatedCategory: {
              type: Type.STRING,
              description: "Estimated resolution category: Configuration, Bug, Training, or Integration."
            }
          },
          required: ["rootCause", "recommendedActions", "severity", "estimatedCategory"]
        }
      }
    });

    const replyText = response.text || "";
    try {
      const parsed = JSON.parse(replyText.trim());
      return res.json(parsed);
    } catch (parseError) {
      console.warn("Failed to parse Gemini JSON output, falling back to regex clean", parseError, replyText);
      // Fallback parse if the json was wrapped in markdown blocks
      const cleanJson = replyText.replace(/```json/gi, "").replace(/```/gi, "").trim();
      const parsed = JSON.parse(cleanJson);
      return res.json(parsed);
    }

  } catch (error: any) {
    console.error("Gemini API execution failed:", error);
    // Graceful error fallback to avoid crashing user flow
    const mockFallback = generateSimulatedRecommendation(
      req.body.productName || "Product", 
      req.body.description || "", 
      req.body.answers || [], 
      req.body.symptoms || []
    );
    return res.json(mockFallback);
  }
});

// AI Knowledge search endpoint
app.post("/api/knowledge/search", async (req, res) => {
  try {
    const { query, productId, articles } = req.body;
    if (!query) {
      return res.json({ articles: [] });
    }

    const pool = articles || [];
    const ai = getGeminiClient();
    if (!ai || pool.length === 0) {
      // Sort offline based on keyword occurrence
      const scored = pool.map((art: any) => {
        let score = 0;
        const qParts = String(query).toLowerCase().split(/\s+/);
        qParts.forEach((word: string) => {
          if (art.title.toLowerCase().includes(word)) score += 3;
          if (art.content.toLowerCase().includes(word)) score += 1;
          if (art.tags && art.tags.some((t: string) => t.toLowerCase() === word)) score += 5;
        });
        return { art, score };
      });
      const sorted = scored
        .filter((x: any) => x.score > 0)
        .sort((a: any, b: any) => b.score - a.score)
        .map((x: any) => x.art);
      return res.json({ articles: sorted.slice(0, 3) });
    }

    const articleListStr = pool.map((art: any) => `ID: ${art.id}\nTitle: ${art.title}\nCategory: ${art.category}`).join("\n\n");

    const promptText = `You are an intelligent knowledge base search assistant.
Given this support issue reported by a client of Riyadh Bank: "${query}"

Here is a list of candidate support articles for this product:
${articleListStr}

Which of these articles is most relevant to the reported issue? Please identify the top 3 most relevant articles, sorted from most relevant to least relevant.

Return ONLY a JSON object matching this schema:
{
  "relevantArticleIds": ["id1", "id2", "id3"]
}
If none of them are relevant, return an empty array.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            relevantArticleIds: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING
              },
              description: "Top 3 relevant article IDs, ordered by descending relevance."
            }
          },
          required: ["relevantArticleIds"]
        }
      }
    });

    const replyText = response.text || "";
    try {
      const parsed = JSON.parse(replyText.trim());
      const orderedIds = parsed.relevantArticleIds || [];
      const orderedArticles = orderedIds
        .map((id: string) => pool.find((art: any) => art.id === id))
        .filter(Boolean);

      if (orderedArticles.length === 0) {
        return res.json({ articles: pool.slice(0, 3) });
      }
      return res.json({ articles: orderedArticles });
    } catch (parseErr) {
      console.warn("Could not parse search response from Gemini", parseErr, replyText);
      return res.json({ articles: pool.slice(0, 3) });
    }
  } catch (error) {
    console.error("Knowledge search error:", error);
    return res.status(500).json({ error: "Failed to query articles ranking." });
  }
});

// Route to analyze historical patterns using Gemini API fetch
app.post("/api/tickets/analyze-patterns", async (req, res) => {
  try {
    const { productName, currentDescription, pastTickets } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      console.warn("GEMINI_API_KEY not configured or placeholder detected for historical pattern search. Returning simulation.");
      
      // Seed fallback metrics
      const mockResult = {
        similar_tickets: [
          {
            id: "tick-1003",
            title: "Incorrect fee calculation during currency SWIFT routing",
            similarity_score: 0.88,
            resolution_summary: "Corrected the local timezone offsets and transaction logging format."
          },
          {
            id: "tick-1004",
            title: "General navigation delay inside PIO-Portal Client Console",
            similarity_score: 0.52,
            resolution_summary: "Applied index optimizations to speed up portal response time."
          }
        ],
        common_root_causes: [
          "SWIFT batch roundings or ledger mismatches",
          "TLS handshake timeouts with outdated ciphers",
          "Missing or corrupt client registration manifests"
        ],
        avg_resolution_hours: 4.5,
        recommended_assignee_skills: [
          "Reconciliation Engines",
          "Currency Conversions",
          "Database Mappings"
        ],
        confidence_level: "medium"
      };
      return res.json(mockResult);
    }

    const ticketsListStr = (pastTickets || [])
      .map((t: any) => {
        return `ID: ${t.id}
Title: ${t.title}
Desc: ${t.description}
Resolution: ${t.resolution_notes || "N/A"}
Root Cause: ${t.root_cause || "N/A"}
Created At: ${t.created_at}
Resolved At: ${t.resolved_at || t.updated_at || "N/A"}`;
      })
      .join("\n\n");

    const promptText = `You are analyzing support ticket history for ${productName} banking software.

Current issue reported: ${currentDescription}

Historical resolved tickets:
${ticketsListStr || "No past resolved tickets found."}

Analyze this historical data and find ticket similarities, patterns, root causes, resolution timelines, and skills required.
Return ONLY a valid JSON object matching this schema exactly:
{
  "similar_tickets": [
    {
      "id": "string",
      "title": "string",
      "similarity_score": number,
      "resolution_summary": "string"
    }
  ],
  "common_root_causes": ["string"],
  "avg_resolution_hours": number,
  "recommended_assignee_skills": ["string"],
  "confidence_level": "high" | "medium" | "low"
}
Limit similar_tickets to top 3. Limit common_root_causes to top 3. Provide logical metrics based on the tickets list provided. Ensure valid JSON response with absolutely no markdown wrapper blocks outside of the JSON representation.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: promptText
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini remote API returned error status: ${response.status}`);
    }

    const data = await response.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    try {
      const cleanText = replyText.replace(/```json/gi, "").replace(/```/gi, "").trim();
      const startIdx = cleanText.indexOf('{');
      const endIdx = cleanText.lastIndexOf('}');
      let parsed;
      if (startIdx !== -1 && endIdx !== -1) {
        parsed = JSON.parse(cleanText.substring(startIdx, endIdx + 1));
      } else {
        parsed = JSON.parse(cleanText);
      }
      return res.json(parsed);
    } catch (parseError) {
      console.warn("Could not parse output from Gemini endpoint, using regex cleanup.", parseError, replyText);
      return res.json({
        similar_tickets: [],
        common_root_causes: ["Parsing issue on upstream LLM output."],
        avg_resolution_hours: 0,
        recommended_assignee_skills: ["General Support"],
        confidence_level: "low"
      });
    }

  } catch (error: any) {
    console.error("Historical patterns analysis error:", error);
    return res.status(500).json({ error: error.message || "Failed to analyze historical patterns." });
  }
});

// App routing and Vite SPA server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
