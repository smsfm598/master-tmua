import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { saveExamResultWithClient } from '../../../lib/supabase'
import { supabaseAdmin } from '../../../lib/supabase-admin'

export async function POST(request) {
  console.log('🚀 [SERVER] /api/save-exam-result POST called')
  try {
    const authResult = await auth()
    console.log('🔐 [SERVER] Clerk auth result:', { userId: authResult?.userId, hasUserId: !!authResult?.userId })

    const { userId } = authResult

    if (!userId) {
      console.warn('⚠️ [SERVER] No userId from Clerk auth')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('📨 [SERVER] Reading request body...')
    const body = await request.json()
    console.log('📋 [SERVER] Request body:', body)

    const { paperName, userAnswers, timeTaken, examType } = body

    if (!paperName || !userAnswers) {
      console.warn('⚠️ [SERVER] Missing required fields:', { hasPaperName: !!paperName, hasUserAnswers: !!userAnswers })
      return NextResponse.json(
        { error: 'Missing required fields: paperName and userAnswers' },
        { status: 400 }
      )
    }

    console.log('💾 [SERVER] Calling saveExamResultWithClient with supabaseAdmin...')
    const result = await saveExamResultWithClient(supabaseAdmin, userId, {
      paperName,
      userAnswers,
      timeTaken,
      examType
    })

    console.log('✅ [SERVER] saveExamResultWithClient returned:', { hasResult: !!result, result })

    if (!result) {
      console.error('❌ [SERVER] saveExamResultWithClient returned null')
      return NextResponse.json(
        { error: 'Failed to save exam result' },
        { status: 500 }
      )
    }

    console.log('🏆 [SERVER] Success! Returning response')
    return NextResponse.json({
      success: true,
      result
    })
  } catch (error) {
    console.error('❌ [SERVER] Full error saving exam result:', error)
    console.error('❌ [SERVER] Error message:', error.message)
    console.error('❌ [SERVER] Error stack:', error.stack)
    if (error.code) {
      console.error('❌ [SERVER] Error code:', error.code)
    }
    if (error.details) {
      console.error('❌ [SERVER] Error details:', error.details)
    }
    if (error.hint) {
      console.error('❌ [SERVER] Error hint:', error.hint)
    }
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
