import axios from "axios";
import logger from "../../utils/logger";
import { GroqClassification, PriceIntent } from "./searchNlpTypes";

const endpoint = "https://api.groq.com/openai/v1/chat/completions";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const preview = (value: string, max = 180) => value.length > max ? `${value.slice(0, max)}...` : value;
const errorDetails = (error: unknown) => {
  const axiosError = axios.isAxiosError(error) ? error : null;
  const aggregateInnerErrors = typeof error === "object" && error !== null && "errors" in error && Array.isArray((error as { errors?: unknown }).errors)
    ? (error as { errors: unknown[] }).errors.map((inner: unknown) => ({
      name: inner instanceof Error ? inner.name : typeof inner,
      message: inner instanceof Error ? inner.message : String(inner),
      code: typeof inner === "object" && inner !== null && "code" in inner ? String((inner as { code?: unknown }).code) : undefined,
    })).slice(0, 5)
    : undefined;
  return {
    errorName: error instanceof Error ? error.name : typeof error,
    errorMessage: error instanceof Error ? error.message : String(error),
    errorCode: axiosError?.code,
    status: axiosError?.response?.status,
    statusText: axiosError?.response?.statusText,
    responseDataPreview: axiosError?.response?.data ? preview(JSON.stringify(axiosError.response.data)) : undefined,
    aggregateErrors: aggregateInnerErrors,
  };
};

const isPriceIntent = (value: unknown): value is PriceIntent | null => value === null || value === "cheap" || value === "mid" || value === "premium";

const validateResponse = (value: unknown): GroqClassification => {
  if (!value || typeof value !== "object") throw new Error("Groq response is not an object");
  const data = value as Record<string, unknown>;
  if (data.intent !== "search_professional" || !Array.isArray(data.keywords) || !data.keywords.every((keyword) => typeof keyword === "string") || !isPriceIntent(data.price_intent ?? null)) throw new Error("Groq response does not match the required schema");
  for (const field of ["profession", "skill", "location", "comment"] as const) if (data[field] !== undefined && data[field] !== null && typeof data[field] !== "string") throw new Error(`Groq response ${field} must be a string or null`);
  return { profession: (data.profession as string | null) ?? null, skill: (data.skill as string | null) ?? null, intent: "search_professional", keywords: data.keywords.map((keyword) => keyword.trim()).filter(Boolean), location: (data.location as string | null) ?? null, price_intent: (data.price_intent as PriceIntent | null) ?? null, comment: (data.comment as string | null) ?? null };
};

export const classifyText = async (query: string, options: { requestId?: string } = {}): Promise<GroqClassification> => {
  const startedAt = Date.now();
  const apiKey = process.env.GROQ_API_KEY?.trim();
  const model = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";
  const requestId = options.requestId;
  if (!apiKey) {
    logger.warn("Search NLP Groq classification skipped: GROQ_API_KEY is not configured", {
      requestId,
      queryPreview: preview(query),
    });
    throw new Error("GROQ_API_KEY is not configured");
  }
  const retries = Number(process.env.GROQ_MAX_RETRIES ?? 2);
  const timeout = Number(process.env.GROQ_TIMEOUT_MS ?? 4000);
  logger.info("Search NLP Groq classification starting", {
    requestId,
    model,
    retries,
    timeout,
    apiKeyConfigured: true,
    apiKeyLength: apiKey.length,
    queryPreview: preview(query),
  });
  const prompt = `You are a search intent parser for a trades marketplace.
                  Common professions: Carpenter, Plumber, Electrician, Handyman, 
                  Mason, Painter, Welder, Technician.
                  
                  Convert the user's natural-language service request into 
                  a JSON classification object. If you can infer a profession 
                  from the query, include it. Otherwise, set to null.
                  
                  **CRITICAL**: Return ONLY the JSON object. 
                  Do NOT include markdown code blocks (no triple backticks).
                  Do NOT include explanatory text before or after the JSON.
                  Do NOT use any formatting or markdown.
                  
                  Examples:
                  "fix my chair" → {"profession":"Carpenter","skill":"Furniture Repair",...}
                  "my sink is leaking" → {"profession":"Plumber","skill":"Pipe Repair",...}
                  "electrical issue" → {"profession":"Electrician","skill":"Wiring",...}
                  
                  User request: "${query}"\n
                  JSON Response:`;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const attemptStartedAt = Date.now();
    try {
      logger.info("Search NLP Groq request attempt", {
        requestId,
        attempt: attempt + 1,
        maxAttempts: retries + 1,
        model,
        timeout,
        endpoint,
      });
      const response = await axios.post(endpoint, 
                                        { model, messages: [{ role: "user", content: prompt }],
                                         temperature: 0, max_tokens: 300 }, 
                                        { timeout, headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } });
      const content = response.data?.choices?.[0]?.message?.content;
      if (typeof content !== "string") throw new Error("Groq returned an empty completion");
      logger.info("Search NLP Groq raw completion received", {
        requestId,
        attempt: attempt + 1,
        status: response.status,
        durationMs: Date.now() - attemptStartedAt,
        contentLength: content.length,
        contentPreview: preview(content),
      });
      logger.debug("Search NLP Groq full response", {
        requestId,
        rawJson: content,  // Full JSON, not just preview
      });
      
      // Extract JSON from markdown code blocks or mixed content
      let jsonContent = content;
      
      // Attempt 1: Extract from ```json ... ``` markdown blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim();
        logger.debug("Search NLP Groq extracted JSON from markdown", {
          requestId,
          attempt: attempt + 1,
          originalLength: content.length,
          extractedLength: jsonContent.length,
        });
      } else {
        // Attempt 2: Extract first valid JSON object if content starts with text before JSON
        if (!jsonContent.startsWith("{")) {
          const firstBrace = content.indexOf("{");
          const lastBrace = content.lastIndexOf("}");
          if (firstBrace !== -1 && lastBrace > firstBrace) {
            jsonContent = content.substring(firstBrace, lastBrace + 1);
            logger.debug("Search NLP Groq extracted JSON from mixed content", {
              requestId,
              attempt: attempt + 1,
              originalLength: content.length,
              extractedLength: jsonContent.length,
            });
          }
        }
      }
      
      const classification = validateResponse(JSON.parse(jsonContent));
      logger.info("Search NLP Groq classification parsed", {
        requestId,
        durationMs: Date.now() - startedAt,
        profession: classification.profession,
        skill: classification.skill,
        intent: classification.intent,
        keywords: classification.keywords,
        location: classification.location,
        priceIntent: classification.price_intent,
      });
      return classification;
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const retryable = status === undefined || status >= 429;
      const finalAttempt = attempt === retries || !retryable;
      logger.warn("Search NLP Groq request failed", {
        requestId,
        attempt: attempt + 1,
        maxAttempts: retries + 1,
        retryable,
        finalAttempt,
        durationMs: Date.now() - attemptStartedAt,
        ...errorDetails(error),
      });
      if (finalAttempt) throw error;
      const backoffMs = 200 * 2 ** attempt;
      logger.info("Search NLP Groq retry scheduled", {
        requestId,
        nextAttempt: attempt + 2,
        backoffMs,
      });
      await sleep(backoffMs);
    }
  }
  throw new Error("Groq classification failed");
};

