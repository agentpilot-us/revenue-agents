// Test GitHub invitation manually
require('dotenv').config({ path: '.env.local' });
const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function testInvite() {
  const org = process.env.GITHUB_ORG?.replace(/"/g, '') || 'agentpilot-pro';
  const teamSlug = process.env.GITHUB_TEAM_NEW_LOGO?.replace(/"/g, '') || 'library-new-logo';
  const testUsername = process.argv[2] || 'YOUR_GITHUB_USERNAME';

  if (testUsername === 'YOUR_GITHUB_USERNAME') {
    console.log('❌ Please provide a GitHub username as an argument:');
    console.log('   node test-github-invite.js YOUR_GITHUB_USERNAME');
    process.exit(1);
  }

  try {
    console.log(`Testing invitation of ${testUsername} to ${org}/${teamSlug}...`);
    
    await octokit.teams.addOrUpdateMembershipForUserInOrg({
      org: org,
      team_slug: teamSlug,
      username: testUsername,
    });
    
    console.log('✅ Success! User invited to team.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.status === 404) {
      console.error('   Team or organization not found. Check GITHUB_ORG and team slug.');
    } else if (err.status === 422) {
      console.error('   User might already be a member or invitation already sent.');
    }
    process.exit(1);
  }
}

testInvite();
