/**
 * Shared industry options for company setup, content import, and targeting.
 * Kept generic for use by any vendor.
 */

export const YOUR_INDUSTRY_OPTIONS = [
  { value: 'technology', label: 'Technology / Software' },
  { value: 'semiconductors', label: 'Technology / Semiconductors' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'healthcare', label: 'Healthcare / Life Sciences' },
  { value: 'financial_services', label: 'Financial Services' },
  { value: 'retail', label: 'Retail / E-commerce' },
  { value: 'energy', label: 'Energy / Utilities' },
  { value: 'other', label: 'Other' },
] as const;

export const PRIMARY_INDUSTRY_SELL_TO_OPTIONS = [
  { value: 'automotive', label: 'Automotive' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'financial_services', label: 'Financial Services' },
  { value: 'retail', label: 'Retail / E-commerce' },
  { value: 'energy', label: 'Energy / Utilities' },
  { value: 'technology', label: 'Technology' },
  { value: 'other', label: 'Other' },
] as const;

/** For "Import multiple industries" checkboxes (display labels). */
export const ADDITIONAL_INDUSTRIES = [
  { value: 'automotive', label: 'Automotive' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'financial_services', label: 'Financial Services' },
  { value: 'retail', label: 'Retail / E-commerce' },
  { value: 'energy', label: 'Energy / Utilities' },
] as const;

export const REFRESH_FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily', hint: 'Good for: frequent product updates, active events' },
  { value: 'weekly', label: 'Weekly', hint: 'Recommended for most companies' },
  { value: 'monthly', label: 'Monthly', hint: 'Good for: stable content, infrequent changes' },
  { value: 'manual', label: 'Manual only', hint: 'You control when to refresh' },
] as const;
