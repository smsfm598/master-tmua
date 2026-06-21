import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { saveExamResultWithClient } from '../../../lib/supabase'
import { supabaseAdmin } from '../../../lib/supabase-admin'

export async function POST(request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { paperName, userAnswers, timeTaken, examType } = body

    if (!paperName || !userAnswers) {
      return NextResponse.json(
        { error: 'Missing required fields: paperName and userAnswers' },
        { status: 400 }
      )
    }

    const result = await saveExamResultWithClient(supabaseAdmin, userId, {
      paperName,
      userAnswers,
      timeTaken,
      examType
    })

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to save exam result' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      result
    })
  } catch (error) {
    console.error('API error saving exam result:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
