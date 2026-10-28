import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";



export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        { error: "Supabase server configuration is missing." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const [
      reviewsResult,
      findingsResult,
    ] = await Promise.all([
      supabase
        .from("brand_reviews")
        .select("id, status, created_at, compliance_score", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("review_findings")
        .select("id, severity, status, created_at", { count: "exact" })
        .limit(5000),
    ]);

    if (reviewsResult.error) {
      console.error("Analytics reviews query failed:", reviewsResult.error);
      return NextResponse.json(
        { error: "Unable to read review analytics from Supabase." },
        { status: 500 }
      );
    }

    if (findingsResult.error) {
      console.error("Analytics findings query failed:", findingsResult.error);
      return NextResponse.json(
        { error: "Unable to read finding analytics from Supabase." },
        { status: 500 }
      );
    }

    const reviews = reviewsResult.data ?? [];
    const findings = findingsResult.data ?? [];

    const reviewsWithScore = reviews.filter(
      (review) =>
        typeof review.compliance_score === "number" &&
        Number.isFinite(review.compliance_score)
    );
    const averageCompliance = reviewsWithScore.length
      ? Math.round(
          reviewsWithScore.reduce(
            (sum, review) => sum + (review.compliance_score as number),
            0
          ) / reviewsWithScore.length
        )
      : null;

    const statusCount = (status: string) =>
      findings.filter(
        (finding) =>
          String(finding.status ?? "").toLowerCase() === status.toLowerCase()
      ).length;

    const severityCount = (severity: string) =>
      findings.filter(
        (finding) =>
          String(finding.severity ?? "").toLowerCase() === severity.toLowerCase()
      ).length;

    const activityByDay = new Map<string, number>();
    for (const review of reviews) {
      if (!review.created_at) continue;
      const day = new Date(review.created_at).toISOString().slice(0, 10);
      activityByDay.set(day, (activityByDay.get(day) ?? 0) + 1);
    }

    return NextResponse.json({
      totals: {
        reviews: reviewsResult.count ?? reviews.length,
        findings: findingsResult.count ?? findings.length,
        highPriority: severityCount("High"),
        verify: severityCount("Verify"),
        accepted: statusCount("Accepted"),
        rejected: statusCount("Rejected"),
        edited: statusCount("Edited"),
        pending: statusCount("Pending"),
        averageCompliance,
        scoredReviews: reviewsWithScore.length,
      },
      recentActivity: Array.from(activityByDay.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-7)
        .map(([date, count]) => ({ date, count })),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while loading analytics." },
      { status: 500 }
    );
  }
}
