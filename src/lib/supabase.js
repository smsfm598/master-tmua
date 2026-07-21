import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const isBrowser = typeof window !== 'undefined'

// Check if environment variables are defined
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase environment variables are not defined')
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseKey || ''
)
// Marking schemes for each paper
const MARKING_SCHEMES = {
  'Specimen Paper 1': 'DDBEDDCFADEDCDAEDBDG', 
  'Specimen Paper 2': 'BBCAAFCCEEDACBEAEEBD',
  'Practice Paper 1': 'HECBCCBFDEEECDCCDABD',
  'Practice Paper 2': 'ABDCCCCBDEDFEBDCHDFE',
  '2017 Paper 1': 'CCABCBBAFEABCFBEDADE', 
  '2017 Paper 2': 'AEGBBAEEDDBCBFDCFBEB', 
  '2018 Paper 1': 'DCEGDEADBECFCBEFABDE',
  '2018 Paper 2': 'CBFDACBDFBAFFEGFCCCB',
  '2019 Paper 1': 'AAECECFEDFHCBBACCBCE',
  '2019 Paper 2': 'ECADBDBEDAAFDBBFDEEB',
  '2020 Paper 1': 'CCBDACADCAEDFECCAAEC',
  '2020 Paper 2': 'EFCGAAHEFFGDDADDEGEC',
  '2021 Paper 1': 'FFGBFDGACBAECBCBABBD',
  '2021 Paper 2': 'DECCBDBCCECBACBEFCFE',
  '2022 Paper 1': 'CDFCHFEBECADADHBDBFB',
  '2022 Paper 2': 'BECBFCFCAGCFEDFDEEBE',
  '2023 Paper 1': 'FACCFEFBEBBFFAFEEEDF',
  '2023 Paper 2': 'HFCGAFEDDAGCCFBBFDHD',
}

// Function to get correct answers for a paper
export const getCorrectAnswers = (paperName) => {
  return MARKING_SCHEMES[paperName] || null
}

// Function to calculate score based on user answers
export const calculateScore = (userAnswers, paperName) => {
  console.log('calculateScore called with paperName:', paperName);
  const correctAnswers = getCorrectAnswers(paperName)
  console.log('correctAnswers found:', correctAnswers);
  
  if (!correctAnswers) {
    console.warn('No marking scheme found for paper:', paperName);
    return { score: 0, totalQuestions: 0, details: [] }
  }
  
  let score = 0
  const details = []
  
  for (let i = 0; i < correctAnswers.length; i++) {
    const questionNumber = i + 1
    const correctAnswer = correctAnswers[i]
    const userAnswer = userAnswers[questionNumber] || ''
    const isCorrect = userAnswer === correctAnswer
    
    if (isCorrect) score++
    
    details.push({
      questionNumber,
      userAnswer,
      correctAnswer,
      isCorrect
    })
  }
  
  return {
    score,
    totalQuestions: correctAnswers.length,
    details
  }
}

// User analytics functions
export const createUserProfile = async (userId, email) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert([
        {
          clerk_user_id: userId,
          email: email,
          created_at: new Date().toISOString(),
          total_exams: 0,
          average_score: 0,
          best_score: 0
        }
      ])
      .select()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating user profile:', error)
    return null
  }
}

export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('clerk_user_id', userId)
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

export const updateUserStats = async (userId, examScore, isNewExam = true, paperName = null) => {
  try {
    // Get current user profile
    const profile = await getUserProfile(userId)
    if (!profile) return null

    // Get all exam results for this user to calculate accurate stats
    const { data: allResults, error: fetchError } = await supabase
      .from('exam_results')
      .select('*')
      .eq('clerk_user_id', userId)
    
    if (fetchError) throw fetchError
    
    // Process results to keep only the highest score for each paper
    const highestScores = {};
    
    // Group by paper_name and keep only the highest score
    if (allResults && allResults.length > 0) {
      allResults.forEach(result => {
        const paperName = result.paper_name;
        
        // If we haven't seen this paper before, or if this score is higher than what we've seen
        if (!highestScores[paperName] || result.score > highestScores[paperName].score) {
          highestScores[paperName] = result;
        }
      });
    }
    
    // Convert the object back to an array and sort by date (newest first)
    const filteredResults = Object.values(highestScores).sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    return filteredResults;
  } catch (error) {
    console.error('Error updating user stats:', error)
    return null
  }
}

// Enhanced saveExamResult function to save ALL attempts
export const saveExamResultWithClient = async (dbClient, userId, examData) => {
  try {
    // Add environment variable check at the start
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      url: supabaseUrl ? 'Set' : 'Missing',
      key: supabaseKey ? 'Set' : 'Missing'
    });

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase environment variables are missing:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      });
      throw new Error('Supabase configuration is incomplete');
    }

    console.log('Starting saveExamResult with:', { userId, examData });

    // Calculate score using marking scheme
    const markingResult = calculateScore(examData.userAnswers, examData.paperName);
    console.log('Marking result:', markingResult);
    
    // Extract wrong answers for storage
    const wrongAnswers = markingResult.details
      .filter(detail => !detail.isCorrect)
      .map(detail => ({
        questionNumber: detail.questionNumber,
        userAnswer: detail.userAnswer,
        correctAnswer: detail.correctAnswer
      }));
    
    // Always save the new attempt (even if there are existing ones)
    console.log('Inserting new exam result (saving all attempts)...');
    const { data, error } = await dbClient
      .from('exam_results')
      .insert([
        {
          clerk_user_id: userId,
          paper_name: examData.paperName,
          score: markingResult.score,
          total_questions: markingResult.totalQuestions,
          time_taken: examData.timeTaken,
          exam_type: examData.examType || 'TMUA',
          wrong_answers: wrongAnswers
        }
      ])
      .select();

    if (error) {
      console.error('Error inserting new result:', error);
      throw error;
    }

    console.log('Successfully inserted new result:', data);
    console.log(`Saved new result: ${markingResult.score} for ${examData.paperName}`);

    // Update user statistics with recalculation
    await updateUserStats(userId, markingResult.score, true, examData.paperName);

    const finalResult = {
      ...data[0],
      markingResult,
      wasUpdated: false
    };
    
    console.log('Final result being returned:', finalResult);
    return finalResult;
  } catch (error) {
    console.error('Error saving exam result:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    });
    return null;
  }
};

export const saveExamResult = async (userId, examData) => {
  console.log('🔍 [CLIENT] saveExamResult called with:', {
    userId,
    examData,
    isBrowser
  })

  if (isBrowser) {
    try {
      console.log('🌐 [CLIENT] Making POST request to /api/save-exam-result')
      const response = await fetch('/api/save-exam-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(examData)
      })

      console.log('📡 [CLIENT] Got response:', {
        status: response.status,
        statusText: response.statusText
      })

      const payload = await response.json().catch((jsonErr) => {
        console.error('❌ [CLIENT] Failed to parse JSON:', jsonErr)
        return {}
      })

      console.log('📝 [CLIENT] Response JSON payload:', payload)

      if (!response.ok) {
        const errorMsg = payload.error || `HTTP error ${response.status}: ${response.statusText}`
        console.error('❌ [CLIENT] Response not ok:', errorMsg)
        throw new Error(errorMsg)
      }

      console.log('✅ [CLIENT] Success, returning payload.result:', payload.result)
      return payload.result || null
    } catch (error) {
      console.error('❌ [CLIENT] Full error saving exam result via API:', error)
      console.error('❌ [CLIENT] Error stack:', error.stack)
      return null
    }
  }

  console.log('📦 [CLIENT] Not in browser, using saveExamResultWithClient directly')
  return saveExamResultWithClient(supabase, userId, examData)
}

export const getUserExamHistoryWithClient = async (dbClient, userId) => {
  try {
    const { data, error } = await dbClient
      .from('exam_results')
      .select('*')
      .eq('clerk_user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching exam history:', error)
    return []
  }
}

export const getUserExamHistory = async (userId) => {
  console.log('🔍 getUserExamHistory called with userId:', userId, 'isBrowser:', isBrowser);
  
  if (isBrowser) {
    try {
      console.log('🌐 Fetching /api/get-exam-history...');
      const response = await fetch('/api/get-exam-history', {
        method: 'GET',
        cache: 'no-store'
      })

      console.log('📡 /api/get-exam-history response status:', response.status);
      const payload = await response.json().catch(() => ({}))
      console.log('📝 /api/get-exam-history payload:', payload);

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to fetch exam history')
      }

      console.log('✅ Returning results:', payload.results || []);
      return payload.results || []
    } catch (error) {
      console.error('❌ Error fetching exam history via API:', error)
      return []
    }
  }

  console.log('📦 Not browser, using getUserExamHistoryWithClient');
  return getUserExamHistoryWithClient(supabase, userId)
}

// Function to get ALL exam results (for marks page)
export const getAllExamResults = async (userId) => {
  return getUserExamHistory(userId)
}

// Function to get only HIGHEST score per paper (for grade boundaries, average, progress)
export const getUserExamResults = async (userId) => {
  const allResults = await getUserExamHistory(userId)
  
  // Group by paper_name and keep only the highest score
  const highestScores = {}
  allResults.forEach(result => {
    const paperName = result.paper_name
    if (!highestScores[paperName] || result.score > highestScores[paperName].score) {
      highestScores[paperName] = result
    }
  })
  
  // Convert back to array and sort by date (newest first)
  return Object.values(highestScores).sort((a, b) => {
    return new Date(b.created_at) - new Date(a.created_at)
  })
}

// Check if user has paid access
export const checkUserEntitlements = async (userId) => {
  try {
    if (!userId) {
      return { hasFullAccess: false, error: 'No user ID provided' };
    }

    const { data, error } = await supabase
      .from('user_entitlements')
      .select('has_full_access, purchase_date, stripe_session_id')
      .eq('clerk_user_id', userId)
      .single();

    if (error) {
      // If no record found, user doesn't have access
      if (error.code === 'PGRST116') {
        return { hasFullAccess: false, error: null };
      }
      console.error('Error checking user entitlements:', error);
      return { hasFullAccess: false, error: error.message };
    }

    return {
      hasFullAccess: data?.has_full_access || false,
      purchaseDate: data?.purchase_date,
      stripeSessionId: data?.stripe_session_id,
      error: null
    };
  } catch (error) {
    console.error('Error in checkUserEntitlements:', error);
    return { hasFullAccess: false, error: error.message };
  }
};

// Check if a specific paper is free to access
export const isPaperFree = (paperName) => {
  const freePapers = ['Specimen Paper 1', 'Specimen Paper 2', 'Practice Paper 1', 'Practice Paper 2'];
  return freePapers.includes(paperName);
};

// Get paper access status for a user
export const getPaperAccess = async (userId, paperName) => {
  // Practice papers are always free
  if (isPaperFree(paperName)) {
    return { hasAccess: true, reason: 'free_paper' };
  }

  // Check if user has paid access
  const entitlements = await checkUserEntitlements(userId);
  
  if (entitlements.error) {
    return { hasAccess: false, reason: 'error', error: entitlements.error };
  }

  return {
    hasAccess: entitlements.hasFullAccess,
    reason: entitlements.hasFullAccess ? 'paid_access' : 'requires_payment'
  };
};
