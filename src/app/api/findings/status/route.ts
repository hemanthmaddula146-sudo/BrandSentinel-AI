import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase server configuration is missing in .env.local." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id, status, suggested_correction } = body;

    if (typeof id !== "string" || !id.trim()) {
      return NextResponse.json(
        { error: "A valid finding ID is required." },
        { status: 400 }
      );
    }

    const allowedStatuses = ["Pending", "Accepted", "Rejected", "Edited"];

    if (
      typeof status !== "string" ||
      !allowedStatuses.includes(status)
    ) {
      return NextResponse.json(
        { error: "Invalid finding status." },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const updates: Record<string, string> = { status };

    if (suggested_correction !== undefined) {
      if (typeof suggested_correction !== "string") {
        return NextResponse.json(
          { error: "The suggested correction must be text." },
          { status: 400 }
        );
      }

      updates.suggested_correction = suggested_correction.slice(0, 1000);
    }

    const { data, error } = await supabase
      .from("review_findings")
      .update(updates)
      .eq("id", id)
      .select("id, status, suggested_correction")
      .maybeSingle();

    if (error) {
      console.error("Finding status update failed:", error);

      return NextResponse.json(
        { error: "Could not save the finding status to Supabase." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Finding not found. Check the finding ID." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      finding: data,
    });
  } catch (error) {
    console.error("Finding status API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while updating the finding." },
      { status: 500 }
    );
  }
}