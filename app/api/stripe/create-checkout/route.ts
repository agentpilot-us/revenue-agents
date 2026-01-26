import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { priceId, email, githubUsername } = await req.json();

    if (!priceId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Map price IDs to product categories
    const priceToCategory: Record<string, string> = {
      [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY || '']: 'complete',
      [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_ANNUAL || '']: 'complete',
      // Add individual library prices when you create them
    };

    const productCategory = priceToCategory[priceId] || 'unknown';

    const session = await stripe.checkout.sessions.create({
      mode: priceId.includes('monthly') || priceId.includes('annual') ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: email,
      metadata: {
        githubUsername: githubUsername || '',
        productCategory,
        stripePriceId: priceId,
      },
      success_url: `${process.env.NEXT_PUBLIC_URL || process.env.NEXTAUTH_URL}/portal?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL || process.env.NEXTAUTH_URL}/pricing`,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

