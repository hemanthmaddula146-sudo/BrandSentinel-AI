import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type GeminiFinding = {
  title?: unknown;
  severity?: unknown;
  phrase?: unknown;
  suggestion?: unknown;
  explanation?: unknown;
};

export async function POST(request: Request) {
  let createdReviewId: string | null = null;

  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!geminiKey) {
      return NextResponse.json(
        { error: "Gemini API key is missing from .env.local." },
        { status: 500 }
      );
    }

    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        { error: "Supabase server configuration is missing." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const content =
      typeof body.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json(
        { error: "Please enter content to analyze." },
        { status: 400 }
      );
    }

    if (content.length > 12000) {
      return NextResponse.json(
        { error: "Content must be under 12,000 characters." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const prompt = `
You are BrandSentinel AI, a brand content governance assistant.

Review this marketing content for:
- Unsupported superlatives
- Absolute guarantees
- Exaggerated promotional language
- Factual claims requiring evidence
- Potentially misleading statements

Brand voice: professional, trustworthy, clear, and honest.

Return only valid JSON:
{
  "summary": "Short review summary",
  "findings": [
    {
      "title": "Issue title",
      "severity": "High",
      "phrase": "Exact phrase from the content",
      "suggestion": "Suggested alternative",
      "explanation": "Why this needs attention"
    }
  ]
}

Severity must be High, Medium, or Verify.
Only quote phrases present in the submitted content.
Do not invent evidence or declare claims false without evidence.
Use an empty findings array if no issues are identified.
Suggestions require human review.

CONTENT:
${content}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    if (!response.text) {
      return NextResponse.json(
        { error: "Gemini returned an empty response." },
        { status: 502 }
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(response.text);
    } catch {
      return NextResponse.json(
        { error: "Gemini returned invalid JSON. Please try again." },
        { status: 502 }
      );
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("summary" in parsed) ||
      !("findings" in parsed) ||
      typeof parsed.summary !== "string" ||
      !Array.isArray(parsed.findings)
    ) {
      return NextResponse.json(
        { error: "Gemini returned an unexpected response format." },
        { status: 502 }
      );
    }

    const allowedSeverities = ["High", "Medium", "Verify"];

    const findings = (parsed.findings as GeminiFinding[])
      .filter(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          !Array.isArray(item)
      )
      .map((item) => ({
        title:
          typeof item.title === "string"
            ? item.title.slice(0, 160)
            : "Content review finding",

        severity: allowedSeverities.includes(String(item.severity))
          ? String(item.severity)
          : "Verify",

        phrase:
          typeof item.phrase === "string"
            ? item.phrase.slice(0, 500)
            : "",

        suggestion:
          typeof item.suggestion === "string"
            ? item.suggestion.slice(0, 1000)
            : "",

        explanation:
          typeof item.explanation === "string"
            ? item.explanation.slice(0, 1500)
            : "Review this wording before publication.",
      }))
      .slice(0, 30);

    const supabase = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Save the main review.
    const { data: review, error: reviewError } = await supabase
      .from("brand_reviews")
      .insert({
        content,
        summary: parsed.summary.slice(0, 2000),
        analysis_type: "Gemini AI",
        status: "Pending",
      })
      .select("id")
      .single();

    if (reviewError || !review) {
      console.error("Supabase review save error:", reviewError);

      return NextResponse.json(
        { error: "Could not save the review to Supabase." },
        { status: 500 }
      );
    }

    createdReviewId = review.id;

    // Insert findings and retrieve their actual database UUIDs.
    let savedFindings: Array<{
      id: string;
      severity: string;
      title: string;
      original_text: string;
      explanation: string;
      suggested_correction: string;
      status: string;
    }> = [];

    if (findings.length > 0) {
      const rows = findings.map((finding) => ({
        review_id: review.id,
        severity: finding.severity,
        title: finding.title,
        original_text: finding.phrase,
        explanation: finding.explanation,
        suggested_correction: finding.suggestion,
        status: "Pending",
      }));

      const { data, error: findingsError } = await supabase
        .from("review_findings")
        .insert(rows)
        .select(
          "id, severity, title, original_text, explanation, suggested_correction, status"
        );

      if (findingsError || !data) {
        console.error("Supabase findings save error:", findingsError);

        // Clean up the review if its findings could not be saved.
        const { error: cleanupError } = await supabase
          .from("brand_reviews")
          .delete()
          .eq("id", review.id);

        if (cleanupError) {
          console.error("Review cleanup error:", cleanupError);
        }

        createdReviewId = null;

        return NextResponse.json(
          {
            error:
              "The review was analyzed, but its findings could not be saved. Check the review_findings table and Supabase permissions.",
          },
          { status: 500 }
        );
      }

      savedFindings = data;
    }

    // Return database UUIDs so Accept, Reject, and Edit update
    // the correct review_findings records.
    const responseFindings = savedFindings.map((finding, index) => ({
      id: index + 1,
      dbId: finding.id,
      title: finding.title,
      severity: finding.severity,
      phrase: finding.original_text,
      suggestion: finding.suggested_correction,
      explanation: finding.explanation,
      status: finding.status,
    }));

    return NextResponse.json({
      summary: parsed.summary.slice(0, 2000),
      findings: responseFindings,
      reviewId: review.id,
      analysisType: "Gemini AI",
      requiresHumanReview: true,
      saved: true,
    });
  } catch (error) {
    console.error("BrandSentinel API error:", error);

    return NextResponse.json(
      { error: "Analysis failed. Check the VS Code terminal for details." },
      { status: 500 }
    );
  }
}