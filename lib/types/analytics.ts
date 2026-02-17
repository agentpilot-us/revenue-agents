export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown';
export type Browser = 'chrome' | 'safari' | 'firefox' | 'edge' | 'other';
export type OS = 'windows' | 'macos' | 'ios' | 'android' | 'linux' | 'other';
export type TrafficSource = 'direct' | 'email' | 'linkedin' | 'organic' | 'paid' | 'referral';

export interface UTMParameters {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface VisitorIdentification {
  email?: string;
  name?: string;
  company?: string;
  jobTitle?: string;
}
