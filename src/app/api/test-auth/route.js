import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  console.log('🧪 [TEST] Test auth route called!');
  
  const authResult = auth();
  console.log('🧪 [TEST] Full auth result:', authResult);
  console.log('🧪 [TEST] User ID:', authResult.userId);
  console.log('🧪 [TEST] Headers:', Object.fromEntries(request.headers.entries()));
  
  return NextResponse.json({
    success: true,
    userId: authResult.userId,
    hasUser: !!authResult.userId,
    timestamp: new Date().toISOString()
  });
}
