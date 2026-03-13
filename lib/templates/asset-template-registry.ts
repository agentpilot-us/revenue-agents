import type {
  DestinationTarget,
  TemplateType,
} from '@/lib/content/channel-config';
import { DEFAULT_BRAND_TOKENS, type BrandTokens } from '@/lib/templates/brand-tokens';

export type AssetTemplateDefinition = {
  templateType: TemplateType;
  label: string;
  brand: BrandTokens;
  supports: DestinationTarget[];
  googleDestination: 'docs' | 'slides' | 'drive' | 'gmail_draft';
};

const TEMPLATE_REGISTRY: Record<TemplateType, AssetTemplateDefinition> = {
  email_message: {
    templateType: 'email_message',
    label: 'Email Draft',
    brand: DEFAULT_BRAND_TOKENS,
    supports: ['gmail_draft', 'copy'],
    googleDestination: 'gmail_draft',
  },
  linkedin_message: {
    templateType: 'linkedin_message',
    label: 'LinkedIn Draft',
    brand: DEFAULT_BRAND_TOKENS,
    supports: ['copy'],
    googleDestination: 'drive',
  },
  linkedin_post: {
    templateType: 'linkedin_post',
    label: 'LinkedIn Post',
    brand: DEFAULT_BRAND_TOKENS,
    supports: ['copy'],
    googleDestination: 'drive',
  },
  slack_message: {
    templateType: 'slack_message',
    label: 'Slack Message',
    brand: DEFAULT_BRAND_TOKENS,
    supports: ['copy'],
    googleDestination: 'drive',
  },
  sms_message: {
    templateType: 'sms_message',
    label: 'SMS Message',
    brand: DEFAULT_BRAND_TOKENS,
    supports: ['copy'],
    googleDestination: 'drive',
  },
  sales_page_html: {
    templateType: 'sales_page_html',
    label: 'Sales Page',
    brand: DEFAULT_BRAND_TOKENS,
    supports: ['html_preview', 'google_docs', 'google_drive_file', 'copy'],
    googleDestination: 'docs',
  },
  presentation_deck: {
    templateType: 'presentation_deck',
    label: 'Presentation Deck',
    brand: DEFAULT_BRAND_TOKENS,
    supports: ['pptx_download', 'google_slides', 'google_drive_file', 'copy'],
    googleDestination: 'slides',
  },
  ad_brief_doc: {
    templateType: 'ad_brief_doc',
    label: 'Ad Brief',
    brand: DEFAULT_BRAND_TOKENS,
    supports: ['html_preview', 'google_docs', 'google_drive_file', 'copy'],
    googleDestination: 'docs',
  },
  demo_runbook: {
    templateType: 'demo_runbook',
    label: 'Demo Runbook',
    brand: DEFAULT_BRAND_TOKENS,
    supports: ['html_preview', 'google_docs', 'google_drive_file', 'copy'],
    googleDestination: 'docs',
  },
  video_script_package: {
    templateType: 'video_script_package',
    label: 'Video Script',
    brand: DEFAULT_BRAND_TOKENS,
    supports: ['html_preview', 'google_docs', 'google_drive_file', 'copy'],
    googleDestination: 'docs',
  },
  generated_image_asset: {
    templateType: 'generated_image_asset',
    label: 'Generated Image',
    brand: DEFAULT_BRAND_TOKENS,
    supports: ['download'],
    googleDestination: 'drive',
  },
  generated_video_asset: {
    templateType: 'generated_video_asset',
    label: 'Generated Video',
    brand: DEFAULT_BRAND_TOKENS,
    supports: ['download'],
    googleDestination: 'drive',
  },
  one_pager_doc: {
    templateType: 'one_pager_doc',
    label: 'One-Pager',
    brand: DEFAULT_BRAND_TOKENS,
    supports: ['html_preview', 'google_docs', 'google_drive_file', 'copy'],
    googleDestination: 'docs',
  },
  talk_track_sheet: {
    templateType: 'talk_track_sheet',
    label: 'Talk Track',
    brand: DEFAULT_BRAND_TOKENS,
    supports: ['html_preview', 'google_docs', 'google_drive_file', 'copy'],
    googleDestination: 'docs',
  },
  champion_kit: {
    templateType: 'champion_kit',
    label: 'Champion Kit',
    brand: DEFAULT_BRAND_TOKENS,
    supports: ['google_slides', 'google_docs', 'google_drive_file', 'gmail_draft', 'copy'],
    googleDestination: 'slides',
  },
  map_timeline: {
    templateType: 'map_timeline',
    label: 'Mutual Action Plan',
    brand: DEFAULT_BRAND_TOKENS,
    supports: ['html_preview', 'google_docs', 'google_drive_file', 'copy'],
    googleDestination: 'docs',
  },
  qbr_report: {
    templateType: 'qbr_report',
    label: 'QBR / EBR Report',
    brand: DEFAULT_BRAND_TOKENS,
    supports: ['google_slides', 'google_docs', 'google_drive_file', 'copy'],
    googleDestination: 'slides',
  },
};

export function getAssetTemplate(templateType: TemplateType): AssetTemplateDefinition {
  return TEMPLATE_REGISTRY[templateType];
}
