/**
 * PhantomBuster – LinkedIn contact search.
 */

export type SearchLinkedInContactsParams = {
  companyDomain?: string;
  companyName?: string;
  limit?: number;
};

export type SearchLinkedInContactsResult =
  | { ok: true; contacts: Array<{ name?: string; url?: string; title?: string }> }
  | { ok: false; error: string };

export async function searchLinkedInContacts(
  params: SearchLinkedInContactsParams
): Promise<SearchLinkedInContactsResult> {
  const limit = params.limit ?? 10;
  // When API key is set, call real PhantomBuster API (not implemented here)
  const apiKey = process.env.PHANTOMBUSTER_API_KEY;
  if (!apiKey) {
    // Stub: return mock contacts so Find Contacts UI flow works without API key
    const mockContacts = [
      { name: 'Lisa Chen', url: 'https://linkedin.com/in/lisa-chen-gm', title: 'Director, Quality Control' },
      { name: 'Robert Kim', url: 'https://linkedin.com/in/robert-kim-gm', title: 'Plant Manager, Ohio Ultium Plant' },
      { name: 'Maria Rodriguez', url: 'https://linkedin.com/in/maria-rodriguez-gm', title: 'Director, Manufacturing Engineering' },
      { name: 'James Wilson', url: 'https://linkedin.com/in/james-wilson-gm', title: 'Senior Quality Engineer' },
      { name: 'Sarah Lee', url: 'https://linkedin.com/in/sarah-lee-gm', title: 'Operations Manager' },
      { name: 'David Park', url: 'https://linkedin.com/in/david-park-gm', title: 'VP Manufacturing Operations' },
      { name: 'Emily Zhang', url: 'https://linkedin.com/in/emily-zhang-gm', title: 'Program Manager, QC' },
      { name: 'Michael Brown', url: 'https://linkedin.com/in/michael-brown-gm', title: 'Manufacturing Technology Lead' },
    ].slice(0, limit);
    return { ok: true, contacts: mockContacts };
  }
  try {
    // TODO: call PhantomBuster API
    return {
      ok: true,
      contacts: [
        { name: 'Stub Contact', url: 'https://linkedin.com/in/stub', title: 'Wire to PhantomBuster API when ready' },
      ],
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Search failed' };
  }
}
