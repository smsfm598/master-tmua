import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { saveExamResult } from '../../../lib/supabase'

export async function POST(request) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { score, answers, flaggedQuestions, durationMinutes, paperName, examType } = body

    if (score === undefined || !answers) {
      return NextResponse.json(
        { error: "Missing required fields: score and answers" },
        { status: 400 }
      )
    }

    // Prepare exam data for Supabase
    const examData = {
      paperName: paperName || 'Unknown Paper',
      userAnswers: answers,
      timeTaken: durationMinutes ? durationMinutes * 60 : null, // Convert to seconds
      examType: examType || 'TMUA'
    }

    // Save using existing Supabase function with automatic marking
    const result = await saveExamResult(userId, examData)
    
    if (!result) {
      return NextResponse.json(
        { error: "Failed to save exam result" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      examId: result.id,
      examDate: result.created_at,
      score: result.score || result.markingResult?.score,
      totalQuestions: result.total_questions || result.markingResult?.totalQuestions,
      percentage: result.percentage
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}