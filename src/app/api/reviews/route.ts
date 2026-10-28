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

    const { data, error } = await supabase
      .from("brand_reviews")
      .select("id, content, summary, analysis_type, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to fetch reviews:", error);

      return NextResponse.json(
        { error: "Unable to load saved reviews." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reviews: data ?? [] });
  } catch (error) {
    console.error("Reviews API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while loading reviews." },
      { status: 500 }
    );
  }
}