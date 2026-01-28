import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { priceId, email, githubUsername } = body;

    // Validate inputs
    if (!priceId || !email || !githubUsername) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate GitHub username format
    const githubRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
    if (!githubRegex.test(githubUsername)) {
      return NextResponse.json(
        { error: 'Invalid GitHub username format' },
        { status: 400 }
      );
    }

    // Create Stripe Checkout session
    const checkoutSession: Stripe.Checkout.Session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: email,
      subscription_data: {
        metadata: {
          userId: session.user.id!,
          githubUsername,
          userEmail: email,
        },
      },
      metadata: {
        userId: session.user.id!,
        githubUsername,
        priceId,
      },
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error: unknown) {
    console.error('Stripe checkout error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
