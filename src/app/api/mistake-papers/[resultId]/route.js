import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { buildMistakePaperFromExam } from "../../../../lib/mistake-papers";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { resultId } = params;

    const { data, error } = await supabaseAdmin
      .from("exam_results")
      .select("id, clerk_user_id, paper_name, score, total_questions, wrong_answers, created_at")
      .eq("id", resultId)
      .eq("clerk_user_id", userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Mistake paper not found" }, { status: 404 });
    }

    const mistakePaper = buildMistakePaperFromExam(data);

    if (!mistakePaper) {
      return NextResponse.json(
        { error: "No mistake paper is available for this result" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      mistakePaper,
    });
  } catch (error) {
    console.error("Error loading mistake paper:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
