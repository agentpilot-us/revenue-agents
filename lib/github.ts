import { Octokit } from '@octokit/rest';

if (!process.env.GITHUB_TOKEN) {
  throw new Error('GITHUB_TOKEN is not set');
}

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function inviteUserToTeam(githubUsername: string, teamSlug: string) {
  try {
    await octokit.teams.addOrUpdateMembershipForUserInOrg({
      org: process.env.GITHUB_ORG!,
      team_slug: teamSlug,
      username: githubUsername,
    });
    
    console.log(`✅ Invited ${githubUsername} to team ${teamSlug}`);
    return { success: true };
  } catch (error: any) {
    console.error(`❌ Failed to invite ${githubUsername} to team ${teamSlug}:`, error.message);
    return { success: false, error: error.message };
  }
}

export function getTeamSlugForProduct(productCategory: string): string | null {
  const teamMap: Record<string, string> = {
    'new-logo': process.env.GITHUB_TEAM_NEW_LOGO!,
    'expansion': process.env.GITHUB_TEAM_EXPANSION!,
    'partner': process.env.GITHUB_TEAM_PARTNER!,
    'sales-velocity': process.env.GITHUB_TEAM_SALES_VELOCITY!,
    'complete': process.env.GITHUB_TEAM_COMPLETE!,
  };
  
  return teamMap[productCategory] || null;
}

