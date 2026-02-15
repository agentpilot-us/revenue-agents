/**
 * Perplexity – company/account research.
 */

export type ResearchCompanyParams = {
  query: string;
  companyDomain?: string;
  companyName?: string;
};

export type ResearchCompanyResult =
  | { ok: true; summary: string; raw?: Record<string, unknown> }
  | { ok: false; error: string };

export async function researchCompany(
  params: ResearchCompanyParams
): Promise<ResearchCompanyResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'PERPLEXITY_API_KEY not configured' };
  }
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'user',
            content: params.query,
          },
        ],
        max_tokens: 1024,
      }),
    });

    // Check if response is OK before parsing JSON
    if (!res.ok) {
      const contentType = res.headers.get('content-type');
      let errorMessage = res.statusText;
      
      // Try to parse JSON error response
      if (contentType?.includes('application/json')) {
        try {
          const errorData = await res.json() as { error?: { message?: string } };
          errorMessage = errorData.error?.message ?? res.statusText;
        } catch {
          // If JSON parsing fails, use status text
        }
      } else {
        // For non-JSON responses (HTML, text, etc.), read as text
        try {
          const text = await res.text();
          // If it's HTML, provide a more helpful error
          if (text.trim().startsWith('<')) {
            errorMessage = `Perplexity API returned HTML error (${res.status}). Check your API key and account status.`;
          } else {
            errorMessage = text.substring(0, 200); // Limit error message length
          }
        } catch {
          // Fall back to status text
        }
      }
      
      return { 
        ok: false, 
        error: `Perplexity API error (${res.status}): ${errorMessage}` 
      };
    }

    // Parse JSON response only if OK
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const summary = data.choices?.[0]?.message?.content ?? '';
    
    if (!summary) {
      return { ok: false, error: 'Perplexity API returned empty response' };
    }
    
    return { ok: true, summary, raw: data as Record<string, unknown> };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Research failed';
    console.error('Perplexity API call error:', errorMessage);
    return { ok: false, error: `Perplexity API error: ${errorMessage}` };
  }
}
