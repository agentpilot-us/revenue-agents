import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { inviteUserToTeam, getTeamSlugForProduct } from '@/lib/github';
import { stripe } from '@/lib/stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  // Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      // Get customer email and metadata
      const customerEmail = session.customer_email || session.customer_details?.email;
      const githubUsername = session.metadata?.githubUsername;
      const productCategory = session.metadata?.productCategory; // "new-logo", "expansion", etc.

      if (!customerEmail) {
        console.error('No customer email found in session');
        return NextResponse.json({ error: 'No customer email' }, { status: 400 });
      }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email: customerEmail },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: customerEmail,
            githubUsername: githubUsername || null,
            stripeCustomerId: session.customer as string,
            subscriptionStatus: session.subscription ? 'active' : null,
            subscriptionTier: session.subscription ? 'pro' : null,
            subscriptionId: session.subscription as string | null,
          },
        });
      } else {
        // Update user with latest info
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            githubUsername: githubUsername || user.githubUsername,
            stripeCustomerId: (session.customer as string) || user.stripeCustomerId,
            subscriptionStatus: session.subscription ? 'active' : user.subscriptionStatus,
            subscriptionTier: session.subscription ? 'pro' : user.subscriptionTier,
            subscriptionId: (session.subscription as string) || user.subscriptionId,
          },
        });
      }

      // Create purchase record
      const purchase = await prisma.purchase.create({
        data: {
          userId: user.id,
          stripeProductId: session.metadata?.stripeProductId || 'unknown',
          stripePriceId: session.metadata?.stripePriceId || session.line_items?.data[0]?.price?.id || 'unknown',
          stripePurchaseId: session.id,
          productType: session.mode === 'subscription' ? 'subscription' : 'library',
          productCategory: productCategory || 'unknown',
          purchaseAmount: (session.amount_total || 0) / 100, // Convert cents to dollars
          purchaseDate: new Date(),
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          status: 'active',
        },
      });

      // Invite to GitHub team if username provided
      if (githubUsername && productCategory) {
        const teamSlug = getTeamSlugForProduct(productCategory);
        
        if (teamSlug) {
          const inviteResult = await inviteUserToTeam(githubUsername, teamSlug);
          
          if (inviteResult.success) {
            // Update purchase record with GitHub team
            await prisma.purchase.update({
              where: { id: purchase.id },
              data: { githubTeamAdded: teamSlug },
            });
            
            console.log(`✅ User ${githubUsername} invited to team ${teamSlug}`);
          } else {
            console.error(`❌ Failed to invite user to GitHub team:`, inviteResult.error);
            // Don't fail the webhook - customer can be manually added later
          }
        }
      }

      // TODO: Send welcome email (Week 3)
      // TODO: Sync to Salesforce (Week 5)

      return NextResponse.json({ 
        success: true, 
        purchaseId: purchase.id,
        githubInvited: !!githubUsername 
      });

    } catch (error: any) {
      console.error('Error processing webhook:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Handle subscription cancellation
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    
    try {
      // Mark subscription as expired
      await prisma.purchase.updateMany({
        where: {
          stripePurchaseId: subscription.id,
          status: 'active',
        },
        data: {
          status: 'expired',
        },
      });

      // Update user subscription status
      await prisma.user.updateMany({
        where: { stripeCustomerId: subscription.customer as string },
        data: {
          subscriptionStatus: 'cancelled',
          subscriptionTier: 'community',
        },
      });

      // TODO: Remove from GitHub team (optional - or let them keep access to current version)

      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error('Error handling subscription cancellation:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Handle subscription updates
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;

    if (subscription.status === 'active') {
      await prisma.user.updateMany({
        where: { stripeCustomerId: subscription.customer as string },
        data: {
          subscriptionStatus: 'active',
          subscriptionTier: 'pro',
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}

