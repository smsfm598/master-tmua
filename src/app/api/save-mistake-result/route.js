import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";

export async function POST(request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { paperName, score, totalQuestions, wrongAnswers, timeTaken } = body;

    if (!paperName || score === undefined || !totalQuestions) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("exam_results")
      .insert([
        {
          clerk_user_id: userId,
          paper_name: paperName,
          score: score,
          total_questions: totalQuestions,
          wrong_answers: wrongAnswers || [],
          time_taken: timeTaken || 0,
          exam_type: "Mistake",
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      result: data[0],
    });
  } catch (error) {
    console.error("Error saving mistake paper result:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
