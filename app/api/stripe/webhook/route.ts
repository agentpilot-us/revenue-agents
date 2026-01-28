import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { inviteUserToTeam, getTeamSlugForProduct } from '@/lib/github';
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

// Map priceId to productCategory (fallback if Stripe product metadata not set)
function getProductCategoryFromPriceId(priceId: string): string {
  const priceToCategory: Record<string, string> = {
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_NEW_LOGO_ANNUAL || '']: 'new-logo',
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_NEW_LOGO_MONTHLY || '']: 'new-logo',
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_EXPANSION_ANNUAL || '']: 'expansion',
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_EXPANSION_MONTHLY || '']: 'expansion',
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PARTNER_ANNUAL || '']: 'partner',
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PARTNER_MONTHLY || '']: 'partner',
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_VELOCITY_ANNUAL || '']: 'sales-velocity',
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_VELOCITY_MONTHLY || '']: 'sales-velocity',
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SUITE_ANNUAL || '']: 'complete',
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SUITE_MONTHLY || '']: 'complete',
  };
  
  return priceToCategory[priceId] || 'unknown';
}

// Handle successful checkout
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing checkout.session.completed:', session.id);

  const { userId, githubUsername, priceId } = session.metadata || {};
  const email = session.customer_email || session.metadata?.userEmail;

  if (!userId || !githubUsername || !email) {
    throw new Error('Missing required metadata');
  }

  // Get price details to determine which library/suite
  const price = await stripe.prices.retrieve(priceId!, {
    expand: ['product'],
  });

  const metadata = price.metadata;
  const githubTeam = metadata.github_team || getTeamSlugForProduct(getProductCategoryFromPriceId(priceId!));

  // Send GitHub team invitation
  if (githubTeam) {
    try {
      const inviteResult = await inviteUserToTeam(githubUsername, githubTeam);
      if (!inviteResult.success) {
        console.error(`Failed to invite ${githubUsername} to team ${githubTeam}:`, inviteResult.error);
        // Don't throw - we still want to record the purchase even if GitHub invitation fails
      }
    } catch (err) {
      console.error('GitHub invitation error:', err);
      // Continue processing purchase even if GitHub invitation fails
    }
  }

  // Get subscription details and calculate expiration
  let expirationDate: Date;
  let subscriptionId: string | null = null;

  if (session.subscription && typeof session.subscription === 'string') {
    try {
      // Let TypeScript infer the type - don't explicitly type it
      const subscriptionResponse = await stripe.subscriptions.retrieve(session.subscription);
      // @ts-ignore - Stripe SDK type definitions may not match runtime behavior
      expirationDate = new Date(subscriptionResponse.current_period_end * 1000);
      // @ts-ignore
      subscriptionId = subscriptionResponse.id;
    } catch (error) {
      console.error('Failed to retrieve subscription:', error);
      // Fallback to 1 year from now
      expirationDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      subscriptionId = session.subscription;
    }
  } else {
    // Fallback: 1 year from now
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
      productCategory: metadata.product_category || getProductCategoryFromPriceId(priceId!),
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

  console.log(`Successfully processed purchase for user ${userId}, GitHub team: ${githubTeam || 'none'}`);
}

// Helper to extract product category from product name (fallback)
function getProductCategoryFromProductName(productName: string | null | undefined): string | null {
  if (!productName) return null;
  
  const name = productName.toLowerCase();
  if (name.includes('new logo') || name.includes('acquisition')) return 'new-logo';
  if (name.includes('expansion') || name.includes('customer expansion')) return 'expansion';
  if (name.includes('partner') || name.includes('channel')) return 'partner';
  if (name.includes('velocity') || name.includes('sales velocity')) return 'sales-velocity';
  if (name.includes('suite') || name.includes('complete') || name.includes('gtm')) return 'complete';
  
  return null;
}

// Handle subscription deletion (cancellation)
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Processing subscription deletion:', subscription.id);

  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    // Try to find user by customer ID
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
        stripePurchaseId: subscription.id,
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

  // Update purchase status - find purchases for this user that are still active
  // Note: stripePurchaseId is the checkout session ID, not subscription ID
  // We update all active purchases for this user since they're tied to the subscription
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

// Handle subscription updates (e.g., plan changes)
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Processing subscription update:', subscription.id);

  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    // Try to find user by customer ID
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
