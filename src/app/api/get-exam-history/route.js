import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getUserExamHistoryWithClient } from '../../../lib/supabase'
import { supabaseAdmin } from '../../../lib/supabase-admin'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const examHistory = await getUserExamHistoryWithClient(supabaseAdmin, userId)
    
    return NextResponse.json({
      success: true,
      results: examHistory,
      exams: examHistory.map(exam => ({
        id: exam.id,
        paperName: exam.paper_name,
        score: exam.score,
        totalQuestions: exam.total_questions,
        percentage: exam.percentage,
        timeTaken: exam.time_taken,
        examType: exam.exam_type,
        createdAt: exam.created_at,
        userAnswers: typeof exam.user_answers === 'string' ? JSON.parse(exam.user_answers) : exam.user_answers,
        flaggedQuestions: typeof exam.flagged_questions === 'string' ? JSON.parse(exam.flagged_questions || '[]') : exam.flagged_questions || []
      }))
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST() {
  // Support both GET and POST for backward compatibility
  return GET()
}
