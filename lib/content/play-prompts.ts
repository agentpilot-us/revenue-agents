type PlayPromptEntry = {
  label: string;
  description: string;
  prompt: string;
};

const PLAY_PROMPTS: Record<string, Record<string, PlayPromptEntry>> = {
  new_logo: {
    executive_introduction: {
      label: 'Executive Introduction',
      description: 'First touch to a net-new prospect',
      prompt: `PLAY CONTEXT: New Logo — Executive Introduction
RULES:
- Reference a SPECIFIC trigger (funding round, leadership change, LinkedIn post, earnings call). Never use a generic opener.
- Speak to their business outcome, NOT your product. Product name should appear zero times in the first paragraph.
- End with a soft CTA: "Worth a 15-minute conversation?" or equivalent. Never hard-close.
- If generating a one-pager: their industry pain → your differentiated outcome → 2-3 proof points (logos, stats). No feature lists.
- If generating a video script: keep to 60 seconds, open with trigger reference, close with soft CTA.
- If generating LinkedIn InMail: reference trigger event in first sentence, link to microsite if available.`,
    },
    multi_threaded_discovery: {
      label: 'Multi-Threaded Discovery',
      description: 'Post-discovery outreach to multiple stakeholders',
      prompt: `PLAY CONTEXT: New Logo — Multi-Threaded Discovery
RULES:
- Each stakeholder gets DIFFERENT content tailored to their role:
  * Champion → solution brief, next steps
  * Economic buyer → ROI teaser, business impact
  * IT/Technical → security, integration, architecture summary
- Discovery follow-up emails must reference SPECIFIC pain points stated in the discovery call (use account context).
- Champion enablement content must be written in the CHAMPION'S voice, not the vendor's. Strip all vendor branding language.
- ROI calculators should be pre-filled with their company size and industry benchmarks.
- Never send the same content to multiple stakeholders.`,
    },
    competitive_displacement: {
      label: 'Competitive Displacement',
      description: 'Prospect is evaluating a competitor',
      prompt: `PLAY CONTEXT: New Logo — Competitive Displacement
RULES:
- NEVER disparage the competitor directly. Focus on outcomes and gaps, not feature-by-feature comparison.
- Tailor to the SPECIFIC objection raised, not a generic battlecard. Use the active objections from account context.
- Competitive case studies should focus on the SWITCHING PROCESS and outcomes, not just the end state.
- Migration plans should address specific risks and provide support details to neutralize "switching is hard."
- If the champion won't engage on the competitive topic, suggest escalating to an executive peer conversation.
- Peer reference call briefs should include: prospect's concern, what reference should emphasize, 3 talking points.`,
    },
  },
  upsell: {
    usage_milestone_expansion: {
      label: 'Usage Milestone Expansion',
      description: 'Customer hitting capacity limits',
      prompt: `PLAY CONTEXT: Upsell — Usage Milestone Expansion
RULES:
- Lead with DATA, not features. Open with their achievement: "Your team has [X outcome] in the last 90 days."
- Frame upgrade as unlocking MORE of what's already working, not buying something new.
- Include opportunity cost framing: "At current capacity, you're leaving [Y] on the table."
- Usage reports should be 1-page visual: what they've achieved, current capacity %, what they're bumping against.
- Demo content should focus ONLY on next-tier features using their actual data/workflows.
- If budget is the objection, build a joint business case — give them tools to sell to finance internally.`,
    },
    roi_expansion_business_case: {
      label: 'ROI Expansion Business Case',
      description: 'EBR-driven expansion',
      prompt: `PLAY CONTEXT: Upsell — ROI Expansion Business Case
RULES:
- EBR structure: Value Delivered (metrics) → Current State Gaps → Expansion Opportunity → Recommended Next Step.
- ROI summaries must be CFO-readable in 90 seconds: cost of current plan, value delivered, projected ROI. Numbers only.
- Champion enablement kit includes: internal-ready deck (no vendor branding on cover), talking points, pre-written email to exec.
- Executive one-pager: strategic outcomes framing only. Zero product features. Business impact + competitive positioning + risk of not expanding.
- Always present 2-3 tiered options (flat renewal, expansion, multi-year).`,
    },
    new_stakeholder_upgrade: {
      label: 'New Stakeholder Upgrade Pitch',
      description: 'New executive joined the account',
      prompt: `PLAY CONTEXT: Upsell — New Stakeholder Upgrade Pitch
RULES:
- Reference the new executive's BACKGROUND and likely priorities (research their LinkedIn, previous company).
- Connect your value to THEIR likely agenda (new leaders want quick wins in first 90 days).
- Video scripts: personalized to the executive, reference their background + company's current usage + strategic opportunity.
- Strategic outcome one-pager: framed around growth, efficiency, or risk reduction based on their role. No features.
- Leverage the existing champion for a warm intro — don't go around them.
- Upgrade proposal: Good/Better/Best options showing what's already achieved and what unlocks at each tier.`,
    },
  },
  cross_sell: {
    champion_led_new_product: {
      label: 'Champion-Led New Product Intro',
      description: 'Using existing champion to open a new department',
      prompt: `PLAY CONTEXT: Cross-Sell — Champion-Led New Product Intro
RULES:
- Champion referral kit: pre-written intro email under 5 sentences. Written in the CHAMPION'S voice, not yours.
- Include: why they're making the intro, one-line value statement, link to explainer video.
- Explainer videos: outcome-focused, not feature tours. Show what the new product solves and who it's for.
- Cross-sell one-pagers open with the NEW DEPARTMENT'S pain, not your product.
- Live demos must be rebuilt for the new department's workflow and language — never reuse the existing customer's demo.
- If champion is hesitant: don't force it. Ask why (political reasons). Offer to reach out directly mentioning their name instead.`,
    },
    adjacent_use_case: {
      label: 'Adjacent Use Case Expansion',
      description: 'Extending current usage to a new workflow',
      prompt: `PLAY CONTEXT: Cross-Sell — Adjacent Use Case Expansion
RULES:
- Bridge from current usage: "You're already solving [X] with us — here's how leading teams extend that to [Y]."
- ROI calculator must be SEPARATE from the existing ROI model — benchmarked for the new use case specifically.
- Workshop decks: 20-30 slides for a 45-60 min working session. Include their current workflow, the gap, and the solution.
- Run workshops as WORKING SESSIONS, not sales pitches. The rep facilitates, doesn't present.
- Post-workshop follow-ups summarize insights from the session and propose scoped next steps.`,
    },
    multi_division_expand: {
      label: 'Multi-Division Land and Expand',
      description: 'Expanding from one division to another',
      prompt: `PLAY CONTEXT: Cross-Sell — Multi-Division Land and Expand
RULES:
- Division-tailored microsites: personalized for the new division's vertical, likely pain, and relevant case studies.
- Executive briefing decks: what you've achieved in Division 1, how it applies to Division 2, business case summary. 8-10 slides max.
- Mutual Action Plans (MAP): shared document with evaluation milestones, owners on both sides, target go-live date.
- Discovery with new division is PURE discovery — no deck, no pitch. Learn their pain, team structure, budget cycle.
- Keep the original champion informed throughout — they're your internal sponsor for the expansion.`,
    },
  },
  renewal: {
    early_renewal_lock_in: {
      label: 'Early Renewal Lock-In',
      description: 'Proactive renewal 90-120 days before expiry',
      prompt: `PLAY CONTEXT: Renewal — Early Renewal Lock-In
RULES:
- Value-realized summaries: top 3-5 metrics in the CUSTOMER'S language (their KPIs, their goals from original sale).
- First touchpoint (Day -90) is PURE VALUE REINFORCEMENT — no renewal mention whatsoever.
- EBR structure: YTD value → Key wins → Product roadmap teaser → Renewal recommendation.
- Product roadmap teaser: frame as "what's coming that we built with customers like you in mind."
- Early renewal proposals: 2-3 options with a specific incentive that expires at a defined date.
- If not signed by Day -30, escalate to At-Risk Save protocols.`,
    },
    at_risk_save: {
      label: 'At-Risk Account Save',
      description: 'Account showing churn signals',
      prompt: `PLAY CONTEXT: Renewal — At-Risk Account Save
CRITICAL RULES:
- NEVER mention renewal, contract terms, pricing, or timeline in ANY content generated during this play.
- Frame ALL outreach around resolving the stated issue. This is a save play, not a sales play.
- Tone must be empathetic and ownership-taking. Never defensive.
- Save plan documents: stated issues, agreed remediation steps, owner on each side, timeline, success criteria.
- Executive sponsor letters: brief, direct, from YOUR executive to THEIRS. Acknowledge concern, commit to resolution, invite direct conversation.
- Remediation roadmaps: visual 30/60/90-day plan with specific, measurable milestones.
- Only restart renewal conversations AFTER trust is rebuilt and the save plan milestones are met.`,
    },
    multi_stakeholder_alignment: {
      label: 'Multi-Stakeholder Renewal Alignment',
      description: 'Complex renewal with multiple decision makers',
      prompt: `PLAY CONTEXT: Renewal — Multi-Stakeholder Renewal Alignment
RULES:
- Persona-specific EBR sections: Finance (ROI, cost-per-outcome), IT (reliability, security, integrations), Ops (efficiency, workflow impact), Exec (strategic impact, competitive positioning).
- ROI summary must be CFO-readable in 90 seconds: investment → value returned → ROI ratio → cost of switching.
- Stakeholder FAQ anticipates questions BY ROLE: Finance (TCO, budget), IT (security, compliance), Ops (change mgmt, training), Exec (strategic fit, roadmap).
- Post-EBR follow-ups are ROLE-SPECIFIC — each stakeholder gets content referencing what mattered most to THEIR role.
- Renewal proposals: 3 options (flat, expansion, multi-year) with projected outcome uplift per option.
- Re-engage dormant stakeholders with value-forward content — no renewal mention in re-engagement.`,
    },
  },
  customer_success: {
    structured_onboarding: {
      label: 'Structured Onboarding',
      description: 'First 30 days post-close',
      prompt: `PLAY CONTEXT: Customer Success — Structured Onboarding
RULES:
- Welcome emails: warm, personal tone. Introduce CSM, confirm kick-off, set 3 clear success milestones for first 30 days.
- Kick-off decks: introductions, success definition (THEIR goals), timeline, roles & responsibilities (both sides), first milestones, how to get help. 15-20 slides.
- Training content is ROLE-SPECIFIC: Admin setup, End user basics, Power user advanced. Never one-size-fits-all.
- 30-day check-in emails are DATA-DRIVEN: milestone progress, wins highlighted, gaps identified, preview of days 31-60.
- IT enablement docs: technical setup, integration checklist, SSO config, admin controls. Send to IT contact at kick-off, not the champion.
- Adoption nudges: specific next-step action, not generic reminders. "Your team is 60% through setup — here's the one step that unlocks [key feature]."`,
    },
    low_adoption_intervention: {
      label: 'Low Adoption Intervention',
      description: 'Usage below threshold',
      prompt: `PLAY CONTEXT: Customer Success — Low Adoption Intervention
RULES:
- Adoption nudge emails reference the SPECIFIC gap: "We noticed your team hasn't activated [Feature X] yet — this is the feature most teams say drives [Outcome Y]."
- How-to videos target the EXACT feature or workflow being avoided. 3-5 minutes max. Show the task, not a feature overview.
- Re-training sessions focus ONLY on the gap area. Not a full product re-demo. Practical, hands-on, role-specific. 20-30 min max.
- First outreach is to the CHAMPION, not the end users. "I wanted to flag some usage data — can we spend 10 minutes to understand what's getting in the way?"
- Distinguish between knowledge gaps (→ training) and workflow issues (→ escalate to SE/Product).
- If adoption hasn't improved by Day 30, flag as at-risk and trigger At-Risk Save play.`,
    },
    advocacy_referral: {
      label: 'Advocacy & Referral Activation',
      description: 'High-NPS customer, capture advocacy',
      prompt: `PLAY CONTEXT: Customer Success — Advocacy & Referral Activation
RULES:
- Advocacy asks happen within 48 HOURS of a positive signal (NPS 9-10, milestone, verbal praise). Don't wait.
- Offer 2-3 LOW-FRICTION options: case study, G2 review, peer reference call, LinkedIn recommendation. Let them choose.
- G2 review asks include a direct link + 3 bullet points of what to highlight (pulled from their own words in past conversations).
- LinkedIn recommendation drafts: write it FOR them — they edit and post. Include their key outcome and one personal insight.
- Case study structure: challenge → solution → measurable outcome. CSM conducts 30-min interview, marketing writes draft.
- Reference program invites: position as exclusive and high-value. Outline what's involved (1-2 calls/quarter) and what they get (early access, advisory input, co-marketing).`,
    },
  },
};

export function getPlayPrompt(motion: string, playId: string): string {
  return PLAY_PROMPTS[motion]?.[playId]?.prompt ?? '';
}

export function getPlaysForMotion(
  motion: string,
): Array<{ id: string; label: string; description: string }> {
  const motionPlays = PLAY_PROMPTS[motion];
  if (!motionPlays) return [];
  return Object.entries(motionPlays).map(([id, entry]) => ({
    id,
    label: entry.label,
    description: entry.description,
  }));
}

export function getAllPlays(): Record<
  string,
  Array<{ id: string; label: string; description: string }>
> {
  const result: Record<
    string,
    Array<{ id: string; label: string; description: string }>
  > = {};
  for (const [motion, plays] of Object.entries(PLAY_PROMPTS)) {
    result[motion] = Object.entries(plays).map(([id, entry]) => ({
      id,
      label: entry.label,
      description: entry.description,
    }));
  }
  return result;
}
