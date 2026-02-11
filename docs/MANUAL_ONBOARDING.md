# Manual Onboarding Process

## When New Purchase Happens

### 1. Check Vercel Logs
- Go to: Vercel → Logs → Filter: `/api/stripe/webhook`
- Look for: "🎉 NEW PURCHASE - MANUAL ACTION REQUIRED"
- Copy all the customer details

### 2. Verify GitHub Username
- Visit: `https://github.com/[username]`
- Confirm account exists
- If 404, email customer for correct username

### 3. Send GitHub Invitation
- Go to: https://github.com/orgs/agentpilot-pro/teams/[team-name]/members
- Click "Add a member"
- Enter GitHub username
- Click "Invite"

### 4. Send Welcome Email

**Subject:** Welcome to Revenue Agents - Your Access is Ready!

**Body:**
```
Hi [Name],

Great news! Your [Library Name] is ready.

🎉 Here's your access:

1. GitHub Repository
   - Check your email for GitHub invitation
   - Accept to access: https://github.com/agentpilot-pro/[repo-name]
   
2. Private Slack Workspace
   - Join here: [Slack invite link]
   - Get deployment help and architecture guidance

3. Deployment Guide
   - Video walkthrough: [Link]
   - Step-by-step guide: [Link]
   - Sample data: Already included in repo

📅 Optional: Book a 30-min kickoff call
[Calendly link]

Most teams deploy a working demo in their sandbox within 2-3 days.

⚡ Quick Start Package Available
Want hands-on deployment? Our Quick Start package ($15K) includes:
- Deployment to your sandbox
- Basic customization
- Team training
- 2-week delivery

Reply to this email or message me in Slack!

Best,
Michelle
Founder, Revenue Agents
```

### 5. Send Slack Invite
- Go to Slack workspace settings
- Generate single-use invite link
- Send to customer email

### 6. Update CRM
- Mark: "onboarding_in_progress"
- Tag: "implementation_qualified"
- Set follow-up task: 3 days

### 7. Monitor Slack
- Watch for their first message
- Proactively reach out if no activity after 48 hours

## Template: Follow-up (48 Hours After)

**Subject:** Quick check-in - How's the deployment going?

**Body:**
```
Hi [Name],

Just checking in! Have you had a chance to clone the repo and spin up the demo?

Common first steps:
1. Clone repo to your local machine
2. Deploy to Salesforce scratch org (instructions in README)
3. Load sample data (included in /data folder)
4. Test the agents (video walkthrough: [link])

Stuck anywhere? I'm here to help!

Also - I noticed you're working on [use case from purchase]. Most teams at your stage find our Quick Start package ($15K) saves 3-4 weeks of trial and error. Want to chat about it?

[Calendar link]

Best,
Michelle
```

## Metrics to Track
- ☐ Time from purchase to GitHub invite sent
- ☐ Time from invite to first Slack message
- ☐ % who book kickoff call
- ☐ % who upgrade to Quick Start within 30 days
- ☐ Common questions/blockers
