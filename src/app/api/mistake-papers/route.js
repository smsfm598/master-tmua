import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { buildMistakePaperCardFromExam } from "../../../lib/mistake-papers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("exam_results")
      .select("id, clerk_user_id, paper_name, score, total_questions, wrong_answers, created_at, exam_type")
      .eq("clerk_user_id", userId)
      .not("exam_type", "eq", "Mistake")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const mistakePapers = (data || [])
      .map((examResult) => {
        try {
          return buildMistakePaperCardFromExam(examResult);
        } catch (error) {
          console.error(
            `Error building mistake paper for result ${examResult.id}:`,
            error,
          );
          return null;
        }
      })
      .filter(Boolean)
      .map((paper) => paper);

    return NextResponse.json({
      success: true,
      mistakePapers,
    });
  } catch (error) {
    console.error("Error loading mistake papers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
