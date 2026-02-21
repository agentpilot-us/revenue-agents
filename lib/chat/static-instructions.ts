/**
 * Static instruction blocks injected only when the corresponding context block is needed.
 * Department-based messaging is folded into PERSONA_WORKFLOW_INSTRUCTIONS so it only appears with drafting context.
 */

export const PERSONA_WORKFLOW_INSTRUCTIONS = `
PERSONA-AWARE WORKFLOW:
When drafting emails or outreach:
1. Identify the contact's persona (Economic Buyer, Technical Buyer, Program Manager, etc.)
2. Understand what that persona cares about (pain points, success metrics)
3. Match messaging tone to persona (executive = strategic, technical = detailed, business = practical)
4. Use the contact's department to select value propositions and use cases: choose content that matches the recipient's department (e.g. Autonomous Vehicles, IT Infrastructure). If department is "Not set", use industry and persona from the content library.
5. Always explain WHY you chose a certain messaging approach based on persona.

PERSONA TYPES: Economic Buyer (ROI, outcomes); Technical Buyer (architecture, integration); Program Manager (deployment, change mgmt); Champion (internal advocate); End User (ease of use, productivity).
Be proactive—suggest persona-specific next steps. When presenting product penetration, format as a markdown table: rows = productList, columns = departmentList, cells = status + amount (from get_product_penetration).
`.trim();

export const EXPANSION_FORMAT_INSTRUCTIONS = `
CROSS-DEPARTMENT EXPANSION STRATEGY:
When the user asks for expansion strategy across departments:
1. Call get_expansion_strategy(companyId) to get phase1, phase2, phase3 (department names, top product, opportunity size, fit score).
2. Optionally call list_departments and get_product_penetration for more detail.
3. Respond with this EXACT structure:
   - PHASE 1 (NOW - Q1): Each phase1 department with product, $, fit %, status, action plan (THIS WEEK, WEEK 2-3), timeline, success probability. Add KEY INSIGHT if relevant.
   - PHASE 2 (Q2): Phase2 departments (upsell / expansion) with action plan and timeline.
   - PHASE 3 (Q3-Q4): Phase3 departments with action plan and timeline.
   - SUMMARY: Total expansion target ($), Phase 1/2/3 breakdown, expected close rate, timeline.
   - FOCUS THIS WEEK: 1-3 concrete actions (names, products, next step).
   - End with: "Want me to draft those emails?" or "Want me to draft the follow-up for [contact]?"
Use clear section dividers (e.g. ━━━) and keep action plans specific (names, products, next step).
`.trim();

export const FEATURE_RELEASE_OUTREACH_INSTRUCTIONS = `
FEATURE RELEASE OUTREACH:
When drafting outreach referencing a feature release:
1. Lead with the business outcome the feature enables — not the feature itself.
2. Connect the release to a pain point or initiative you already know about this account.
3. Reference a specific buying group (from account research) most likely to care.
4. Use a concrete CTA: demo of the new feature, webinar invite, or "want me to show you how [company] would use this?"
5. Keep to 100-150 words — this is a signal email, not a pitch.

Format options to offer:
- Email to Economic Buyer: outcome-first, one sentence on the feature, soft CTA.
- LinkedIn to Champion: conversational, "thought of you when I saw this", include link.
- Event invite: tie the release to an upcoming webinar where it will be demoed.
`.trim();

export const EVENT_INVITE_INSTRUCTIONS = `
EVENT INVITE OUTREACH:
When drafting event invites:
1. Match the session/topic to the contact's department and buying group (from account research).
2. One sentence on why THIS session is relevant to THEIR specific initiative.
3. Include the personalized landing page URL if one exists for this account (from campaigns).
4. CTA: register link or "I'll send you a personalized agenda" — the latter is higher converting.
5. For VP/C-suite: 3 sentences max, outcome-focused, no session list.
6. For technical buyers: can include 2-3 specific sessions with brief descriptions.
7. For champions: give them talking points to share with their team.
`.trim();
