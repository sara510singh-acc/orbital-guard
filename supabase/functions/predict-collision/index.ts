
declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function safeString(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "Not provided";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value).slice(0, 500);
  }

  return "Invalid data format";
}

Deno.serve(async (req: Request) => {
  // Handle browser preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { error: "Method not allowed" },
      405
    );
  }

  try {
    // Read request data
    const body = await req.json();

    const satelliteData = body.satelliteData;
    const debrisData = body.debrisData;
    const timeframe = body.timeframe;

    if (
      !satelliteData ||
      typeof satelliteData !== "object" ||
      !debrisData ||
      typeof debrisData !== "object"
    ) {
      return jsonResponse(
        { error: "Valid satelliteData and debrisData are required" },
        400
      );
    }

    // Read API key securely from Supabase Secrets
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY secret is missing");

      return jsonResponse(
        { error: "OpenAI API key is not configured" },
        500
      );
    }

    // System instructions
    const systemPrompt = `
You are OrbitalGuard, an assistant for satellite collision-risk analysis.

Your job is to interpret the satellite information supplied to you.

IMPORTANT RULES:
- Never invent collision probabilities.
- Never invent distances or closest approach times.
- Do not claim that orbital propagation or scientific collision calculations
  have been performed unless actual calculation results are supplied.
- Clearly distinguish known information from missing information.
- Explain potential risks in simple technical language.
- Provide general safety considerations.
- Do not issue autonomous maneuver commands.

Return a concise assessment with these sections:
1. Summary
2. Preliminary risk considerations
3. Available orbital information
4. Missing information
5. Recommended next steps for further analysis

If the supplied information is insufficient, clearly say so.
`;

    // User input
    const userPrompt = `
Analyze the following satellite information.

SATELLITE:
Name: ${safeString(satelliteData.name)}
Orbit: ${safeString(satelliteData.orbit)}
Velocity: ${safeString(satelliteData.velocity)}
Position: ${safeString(satelliteData.position)}

NEARBY DEBRIS:
Object count: ${safeString(debrisData.count)}

TIMEFRAME:
${safeString(timeframe || "24-72 hours")}

Provide a preliminary assessment.
Do not manufacture numerical collision probabilities.
`;

    // Send request to OpenAI Responses API
    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          instructions: systemPrompt,
          input: userPrompt,
          max_output_tokens: 500,
          reasoning: {
            effort: "low",
          },
          store: false,
        }),
      }
    );

    // Handle OpenAI API errors
    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "OpenAI API request failed:",
        response.status,
        errorText
      );

      return jsonResponse(
        {
          error: "OpenAI API request failed",
          status: response.status,
          details: errorText.slice(0, 1000),
        },
        502
      );
    }

    // Read OpenAI response
    const data = await response.json();

    // Log diagnostic information, not the API key or full prompt
    console.log(
      "OpenAI response diagnostics:",
      JSON.stringify({
        status: data.status,
        incomplete_details: data.incomplete_details,
        outputTypes: (data.output ?? []).map(
          (item: any) => ({
            type: item.type,
            status: item.status,
            contentTypes: (item.content ?? []).map(
              (part: any) => part.type
            ),
          })
        ),
      })
    );

    // Extract generated text from output messages
    const prediction = (data.output ?? [])
      .filter((item: any) => item.type === "message")
      .flatMap((item: any) => item.content ?? [])
      .map((part: any) => {
        if (part.type === "output_text") {
          return part.text ?? "";
        }

        if (part.type === "refusal") {
          return part.refusal ?? "";
        }

        return "";
      })
      .filter((text: string) => text.trim().length > 0)
      .join("\n");

    // Handle incomplete or empty responses
    if (!prediction) {
      console.error(
        "No readable output from OpenAI:",
        JSON.stringify({
          status: data.status,
          incomplete_details: data.incomplete_details,
          output: data.output,
        })
      );

      return jsonResponse(
        {
          error: "OpenAI returned no readable text",
          status: data.status ?? "unknown",
          reason:
            data.incomplete_details?.reason ?? "No output text found",
        },
        502
      );
    }

    console.log("AI assessment generated successfully");

    // Preserve the original frontend response structure
    return jsonResponse({
      prediction: prediction,
    });

  } catch (error) {
    console.error("Predict-collision function error:", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error",
      },
      500
    );
  }
});
