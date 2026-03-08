/**
 * URL builders for external email clients and LinkedIn.
 * Used by StepSendAction to offer "Open in Gmail", "Open in Outlook", etc.
 */

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export function buildGmailComposeUrl(opts: {
  to?: string;
  subject?: string;
  body?: string;
}): string {
  const params = new URLSearchParams();
  params.set('view', 'cm');
  if (opts.to) params.set('to', opts.to);
  if (opts.subject) params.set('su', opts.subject);
  if (opts.body) params.set('body', stripHtml(opts.body));
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function buildOutlookComposeUrl(opts: {
  to?: string;
  subject?: string;
  body?: string;
}): string {
  const params = new URLSearchParams();
  if (opts.to) params.set('to', opts.to);
  if (opts.subject) params.set('subject', opts.subject);
  if (opts.body) params.set('body', stripHtml(opts.body));
  return `https://outlook.office.com/mail/deeplink/compose?${params.toString()}`;
}

export function buildLinkedInProfileUrl(linkedinUrl: string | null): string | null {
  if (!linkedinUrl) return null;
  return linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`;
}

export function buildLinkedInMessageUrl(linkedinUrl: string | null): string | null {
  if (!linkedinUrl) return null;
  const url = linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`;
  const clean = url.replace(/\/$/, '');
  return `${clean}/overlay/create-message/`;
}
