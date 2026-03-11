export type BrandTokens = {
  appName: string;
  accentColor: string;
  accentColorDark: string;
  textColor: string;
  mutedTextColor: string;
  surfaceColor: string;
  borderColor: string;
  headingFont: string;
  bodyFont: string;
};

export const DEFAULT_BRAND_TOKENS: BrandTokens = {
  appName: 'AgentPilot',
  accentColor: '#6d28d9',
  accentColorDark: '#4c1d95',
  textColor: '#111827',
  mutedTextColor: '#4b5563',
  surfaceColor: '#f8fafc',
  borderColor: '#e5e7eb',
  headingFont: 'ui-sans-serif, system-ui, sans-serif',
  bodyFont: 'ui-sans-serif, system-ui, sans-serif',
};
