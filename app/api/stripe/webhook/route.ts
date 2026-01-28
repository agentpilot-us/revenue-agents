import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook handler error:', err);
    return NextResponse.json(
      { error: `Webhook handler failed: ${message}` },
      { status: 500 }
    );
  }
}

// Handle successful checkout
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing checkout.session.completed:', session.id);

  const { userId, githubUsername, priceId } = session.metadata || {};
  const email = session.customer_email || session.metadata?.userEmail;

  if (!userId || !githubUsername || !email) {
    throw new Error('Missing required metadata');
  }

  // Get price details to determine which library
  const price = await stripe.prices.retrieve(priceId!, {
    expand: ['product'],
  });

  const metadata = price.metadata;
  const productName = (price.product as Stripe.Product).name;
  const productCategory = metadata.product_category || 'unknown';
  const githubTeam = metadata.github_team;

  // Get subscription details
  let expirationDate: Date;
  let subscriptionId: string | null = null;

  if (session.subscription && typeof session.subscription === 'string') {
    subscriptionId = session.subscription;
    try {
      const subscription: any = await stripe.subscriptions.retrieve(session.subscription);
      
      if (subscription && subscription.current_period_end) {
        const timestamp = typeof subscription.current_period_end === 'number' 
          ? subscription.current_period_end 
          : parseInt(subscription.current_period_end);
        
        expirationDate = new Date(timestamp * 1000);
        
        if (isNaN(expirationDate.getTime())) {
          console.error('Invalid date from subscription, using fallback');
          expirationDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        }
      } else {
        expirationDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }
    } catch (error) {
      console.error('Failed to retrieve subscription:', error);
      expirationDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    }
  } else {
    expirationDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  }

  // Final validation
  if (isNaN(expirationDate.getTime())) {
    console.error('Expiration date is still invalid, forcing 1 year fallback');
    expirationDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  }

  // Save purchase to database
  await prisma.purchase.create({
    data: {
      userId,
      stripeProductId: (price.product as Stripe.Product).id,
      stripePriceId: priceId!,
      stripePurchaseId: session.id,
      productType: metadata.product_type || 'library',
      productCategory,
      purchaseAmount: (session.amount_total || 0) / 100,
      purchaseDate: new Date(),
      expirationDate,
      status: 'active',
      githubTeamAdded: githubTeam || null,
    },
  });

  // Update user subscription info
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionId: subscriptionId,
      subscriptionStatus: 'active',
      subscriptionTier: 'professional',
      githubUsername,
    },
  });

  // Log for manual processing
  console.log('=================================');
  console.log('🎉 NEW PURCHASE - MANUAL ACTION REQUIRED');
  console.log('=================================');
  console.log('Customer:', email);
  console.log('Name:', session.metadata?.userName || 'Not provided');
  console.log('Product:', productName);
  console.log('Category:', productCategory);
  console.log('Amount:', `$${(session.amount_total || 0) / 100}`);
  console.log('GitHub Username:', githubUsername);
  console.log('GitHub Team:', githubTeam);
  console.log('User ID:', userId);
  console.log('Subscription ID:', subscriptionId);
  console.log('=================================');
  console.log('NEXT STEPS:');
  console.log('1. Verify GitHub username exists: https://github.com/' + githubUsername);
  if (githubTeam) {
    console.log('2. Invite to team: https://github.com/orgs/agentpilot-pro/teams/' + githubTeam);
  }
  console.log('3. Send welcome email with resources');
  console.log('4. Send Slack workspace invite');
  console.log('=================================');

  console.log(`Successfully processed purchase for user ${userId}`);
}

// Handle subscription deletion (cancellation)
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Processing subscription deletion:', subscription.id);

  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    // Try to find user by subscription ID
    const user = await prisma.user.findFirst({
      where: { subscriptionId: subscription.id },
    });
    
    if (!user) {
      console.warn(`Could not find user for subscription ${subscription.id}`);
      return;
    }
    
    // Update user subscription status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'canceled',
      },
    });

    // Update purchase status
    await prisma.purchase.updateMany({
      where: {
        userId: user.id,
        status: 'active',
      },
      data: {
        status: 'canceled',
      },
    });

    console.log(`Subscription canceled for user ${user.id}`);
    return;
  }

  // Update user subscription status
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'canceled',
    },
  });

  // Update purchase status
  await prisma.purchase.updateMany({
    where: {
      userId,
      status: 'active',
    },
    data: {
      status: 'canceled',
    },
  });

  console.log(`Subscription canceled for user ${userId}`);
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Processing subscription update:', subscription.id);

  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    // Try to find user by subscription ID
    const user = await prisma.user.findFirst({
      where: { subscriptionId: subscription.id },
    });
    
    if (!user) {
      console.warn(`Could not find user for subscription ${subscription.id}`);
      return;
    }
    
    // Update user subscription status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: subscription.status === 'active' ? 'active' : subscription.status,
      },
    });

    console.log(`Subscription updated for user ${user.id}, status: ${subscription.status}`);
    return;
  }

  // Update user subscription status
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: subscription.status === 'active' ? 'active' : subscription.status,
    },
  });

  console.log(`Subscription updated for user ${userId}, status: ${subscription.status}`);
}
