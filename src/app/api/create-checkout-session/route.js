import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@clerk/nextjs/server';

// Add validation for the Stripe secret key
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  console.log('🚀 [API] create-checkout-session called!');
  try {
    const authResult = await auth(); // <-- ADD AWAIT HERE!
    console.log('🔐 [API] Full auth() result:', authResult);
    
    const { userId } = authResult;
    console.log('🔐 [API] Extracted userId:', userId);
    
    if (!userId) {
      console.warn('⚠️ [API] No user ID, returning 401!');
      console.warn('⚠️ [API] Headers from request:', Object.fromEntries(request.headers.entries()));
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { priceId } = await request.json();
    console.log('📋 [API] Price ID received:', priceId);
    
    if (!priceId) {
      console.warn('⚠️ [API] No price ID, returning 400');
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    console.log('💳 [API] Creating Stripe checkout session...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `https://mastertmua.com/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://mastertmua.com/`,
      metadata: {
        userId: userId,
      },
      customer_email: undefined, // Stripe will collect email
    });

    console.log('✅ [API] Checkout session created:', session.id);
    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('❌ [API] Error creating checkout session:', error);
    console.error('❌ [API] Error details:', {
      message: error.message,
      code: error.code,
      type: error.type,
      param: error.param,
    });
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}