import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { octokit } from '@/lib/github';
import { stripe } from '@/lib/stripe';

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
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Create/update user in database
      await prisma.user.upsert({
        where: { email: session.customer_email! },
        create: {
          email: session.customer_email!,
          githubUsername: session.metadata?.githubUsername || null,
          stripeCustomerId: session.customer as string,
          subscriptionStatus: 'active',
          subscriptionTier: 'pro',
          subscriptionId: session.subscription as string,
        },
        update: {
          githubUsername: session.metadata?.githubUsername || null,
          stripeCustomerId: session.customer as string,
          subscriptionStatus: 'active',
          subscriptionTier: 'pro',
          subscriptionId: session.subscription as string,
        },
      });

      // Send GitHub invitation if username provided
      if (session.metadata?.githubUsername && process.env.GITHUB_ORG && process.env.GITHUB_TEAM_ID) {
        try {
          // First, try to get user by username
          const githubUser = await octokit.users.getByUsername({
            username: session.metadata.githubUsername,
          });

          await octokit.orgs.createInvitation({
            org: process.env.GITHUB_ORG!,
            invitee_id: githubUser.data.id,
            team_ids: [parseInt(process.env.GITHUB_TEAM_ID!)],
          });
        } catch (githubError: any) {
          console.error('GitHub invitation error:', githubError);
          // Don't fail the webhook if GitHub invite fails
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;

      await prisma.user.updateMany({
        where: { stripeCustomerId: subscription.customer as string },
        data: {
          subscriptionStatus: 'cancelled',
          subscriptionTier: 'community',
        },
      });
    }

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
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

