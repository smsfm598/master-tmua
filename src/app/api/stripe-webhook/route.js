import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        const userId = session.metadata.userId;
        
        if (!userId) {
          console.error('No userId found in session metadata');
          break;
        }

        // Log the webhook event
        await supabase
          .from('stripe_webhook_events')
          .insert({
            stripe_event_id: event.id,
            event_type: event.type,
            processed: true,
            user_id: userId,
            session_id: session.id,
            amount_total: session.amount_total,
            currency: session.currency,
          });

        // Grant full access to the user
        const { error: entitlementError } = await supabase
          .from('user_entitlements')
          .upsert({
            clerk_user_id: userId,
            has_full_access: true,
            purchase_date: new Date().toISOString(),
            stripe_session_id: session.id,
          }, {
            onConflict: 'clerk_user_id'
          });

        if (entitlementError) {
          console.error('Error updating user entitlements:', entitlementError);
        } else {
          console.log(`Full access granted to user ${userId}`);
        }
        
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}