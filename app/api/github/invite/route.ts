import { NextRequest, NextResponse } from 'next/server';
import { octokit } from '@/lib/github';

export async function POST(req: NextRequest) {
  try {
    const { githubUsername } = await req.json();

    if (!githubUsername) {
      return NextResponse.json(
        { error: 'GitHub username is required' },
        { status: 400 }
      );
    }

    if (!process.env.GITHUB_ORG || !process.env.GITHUB_TEAM_ID) {
      return NextResponse.json(
        { error: 'GitHub organization not configured' },
        { status: 500 }
      );
    }

    // Get user by username
    const githubUser = await octokit.users.getByUsername({
      username: githubUsername,
    });

    // Create invitation
    await octokit.orgs.createInvitation({
      org: process.env.GITHUB_ORG,
      invitee_id: githubUser.data.id,
      team_ids: [parseInt(process.env.GITHUB_TEAM_ID)],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('GitHub invite error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send GitHub invitation' },
      { status: 500 }
    );
  }
}

