import { getChatModel } from '@/lib/llm/get-model';
import { isDemoContext, getDemoPersona } from './context';

type DemoScenario = 'chat' | 'plan_preview' | 'sales_page' | 'email_draft' | 'research_summary';

type DemoAwareOpts = {
  user: { email?: string | null };
  company?: { isDemoAccount?: boolean | null } | null;
  scenario: DemoScenario;
  // Free-form payload; for demo we only need enough to pick a canned response.
  payload: unknown;
};

/**
 * Minimal demo-aware wrapper for LLM usage.
 *
 * In demo mode:
 * - Simulates latency
 * - Returns a lightweight canned object depending on persona + scenario
 *
 * In normal mode:
 * - Falls back to the default chat model; callers are responsible for
 *   constructing prompts and parsing responses.
 */
export async function generateDemoAware(opts: DemoAwareOpts) {
  const { user, company, scenario, payload } = opts;

  if (isDemoContext({ user, company })) {
    const persona = getDemoPersona(user.email);
    // Small artificial delay so demo feels like a real API call
    await new Promise((resolve) => setTimeout(resolve, 700));

    // Very small, opinionated canned snippets by persona & scenario.
    if (scenario === 'plan_preview') {
      return getDemoPlanPreview(persona, payload);
    }
    if (scenario === 'sales_page') {
      return getDemoSalesPage(persona, payload);
    }
    if (scenario === 'research_summary') {
      return getDemoResearchSummary(persona, payload);
    }
    // Chat and email_draft can be added later as needed.
    return getDemoFallback(persona);
  }

  // Non-demo path: delegate to the normal chat model.
  const model = getChatModel();
  return model;
}

function getDemoPlanPreview(persona: ReturnType<typeof getDemoPersona>, _payload: unknown) {
  if (persona === 'sercante') {
    return {
      subject: 'Congrats on the big win — quick idea for your next deal',
      bodyPreview:
        'Loved seeing your recent enterprise banking win. Based on similar deals, here’s how bringing us in early can help you move even faster on the next opportunity…',
    };
  }
  if (persona === 'nvidia_gm') {
    return {
      subject: 'GM AV investment — proposal for next NVIDIA use case',
      bodyPreview:
        'GM’s latest AV investments open a window for expanding NVIDIA’s footprint beyond IT. Here’s a short briefing you can use with the AV engineering team…',
    };
  }
  if (persona === 'revenue_vessel_fedex') {
    return {
      subject: 'FedEx data preview — what you’re not seeing today',
      bodyPreview:
        'We pulled a sample of shipping and customer segments for FedEx’s core markets. It highlights pockets of demand your current targeting likely misses…',
    };
  }
  return getDemoFallback(persona);
}

function getDemoSalesPage(persona: ReturnType<typeof getDemoPersona>, _payload: unknown) {
  if (persona === 'nvidia_gm') {
    return {
      headline: 'Unlock new GM divisions with NVIDIA-powered AI',
      subheadline: 'From IT to Manufacturing and AV — a roadmap for expanding NVIDIA at GM.',
    };
  }
  if (persona === 'revenue_vessel_fedex') {
    return {
      headline: 'See the shipping demand your data can’t currently reach',
      subheadline: 'A live preview of Revenue Vessel’s coverage for FedEx’s target markets.',
    };
  }
  if (persona === 'sercante') {
    return {
      headline: 'Your go-to Salesforce implementation partner for Financial Services',
      subheadline: 'Co-selling playbooks that make you look like the hero in every enterprise deal.',
    };
  }
  return getDemoFallback(persona);
}

function getDemoResearchSummary(persona: ReturnType<typeof getDemoPersona>, _payload: unknown) {
  if (persona === 'nvidia_gm') {
    return {
      summary:
        'GM’s latest earnings highlighted increased investment in autonomous and software-defined vehicles, with specific call-outs for AV safety and digital twin initiatives in manufacturing. Both align directly with NVIDIA’s platform strengths and create expansion paths beyond the current IT footprint.',
    };
  }
  if (persona === 'revenue_vessel_fedex') {
    return {
      summary:
        'FedEx faces continued pressure on margins and on-time performance, driving renewed interest in better customer segmentation and route optimization. Recent hiring for data and analytics roles supports a data-led proof-of-value motion.',
    };
  }
  if (persona === 'sercante') {
    return {
      summary:
        'Salesforce continues to invest in industry clouds and AI co-pilots, especially in Financial Services. AEs in this segment are under pressure to differentiate with partners who can execute quickly on complex implementations.',
    };
  }
  return getDemoFallback(persona);
}

function getDemoFallback(persona: ReturnType<typeof getDemoPersona>) {
  return {
    note: 'Demo mode response',
    persona,
  };
}

