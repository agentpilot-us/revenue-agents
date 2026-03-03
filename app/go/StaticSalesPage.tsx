'use client';

import { useCallback } from 'react';
import type { SalesPageSection } from '@/types/sales-page';
import {
  HeroSection,
  ValuePropsGrid,
  HowItWorksSection,
  ComparisonTable,
  SocialProofBanner,
  CaseStudyCard,
  FAQAccordion,
  CTASection,
  FeatureSection,
  EventSection,
} from '@/app/go/sections';

type Props = {
  companyName: string;
  logoUrl?: string;
  headline: string | null;
  subheadline: string | null;
  sections: SalesPageSection[];
  ctaLabel: string | null;
  ctaUrl: string | null;
  campaignId: string;
  visitId?: string | null;
  onTrackCtaClick?: () => void;
};

export function StaticSalesPage({
  companyName,
  logoUrl,
  headline,
  subheadline,
  sections,
  ctaLabel,
  ctaUrl,
  campaignId,
  visitId,
  onTrackCtaClick,
}: Props) {
  const trackCta = useCallback(() => {
    onTrackCtaClick?.();
    if (visitId) {
      fetch(`/api/go/${campaignId}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'cta_click', visitId }),
      }).catch(() => {});
    }
  }, [campaignId, visitId, onTrackCtaClick]);

  const hasHeroSection = sections.some((s) => s.type === 'hero');
  const ctaHref = ctaUrl || '#';

  return (
    <>
      {hasHeroSection ? (
        sections
          .filter((s) => s.type === 'hero')
          .map((section, i) => (
            <SectionBlock
              key={`hero-${i}`}
              section={section}
              companyName={companyName}
              logoUrl={logoUrl}
              onCtaClick={trackCta}
            />
          ))
      ) : (headline || subheadline) ? (
        <HeroSection
          headline={headline ?? 'Welcome'}
          body={subheadline ?? ''}
          companyName={companyName}
          logoUrl={logoUrl}
        />
      ) : null}

      <div className="px-8 py-6 space-y-6">
        {sections
          .filter((s) => s.type !== 'hero')
          .map((section, i) => (
            <SectionBlock
              key={i}
              section={section}
              companyName={companyName}
              logoUrl={logoUrl}
              onCtaClick={trackCta}
            />
          ))}

        {!sections.some((s) => s.type === 'cta') && (ctaLabel || ctaUrl) && (
          <CTASection
            headline="Ready to get started?"
            buttonLabel={ctaLabel || 'Learn more'}
            buttonUrl={ctaHref}
            onCtaClick={trackCta}
          />
        )}
      </div>
    </>
  );
}

function SectionBlock({
  section,
  companyName,
  logoUrl,
  onCtaClick,
}: {
  section: SalesPageSection;
  companyName?: string;
  logoUrl?: string;
  onCtaClick?: () => void;
}) {
  switch (section.type) {
    case 'hero':
      return (
        <HeroSection
          headline={section.headline}
          body={section.body}
          backgroundContext={section.backgroundContext}
          companyName={companyName}
          logoUrl={logoUrl}
        />
      );
    case 'value_props':
      return <ValuePropsGrid items={section.items} />;
    case 'how_it_works':
      return <HowItWorksSection steps={section.steps} />;
    case 'comparison':
      return (
        <ComparisonTable
          title={section.title}
          withoutProduct={section.withoutProduct}
          withProduct={section.withProduct}
          rows={section.rows}
        />
      );
    case 'feature':
      return (
        <FeatureSection
          title={section.title}
          description={section.description}
          bulletPoints={section.bulletPoints}
        />
      );
    case 'event':
      return (
        <EventSection
          name={section.name}
          date={section.date}
          location={section.location}
          description={section.description}
          registerUrl={section.registerUrl}
        />
      );
    case 'case_study':
      return (
        <CaseStudyCard
          company={section.company}
          result={section.result}
          quote={section.quote}
        />
      );
    case 'social_proof':
      return (
        <SocialProofBanner
          metrics={section.metrics}
          quotes={section.quotes}
        />
      );
    case 'faq':
      return <FAQAccordion items={section.items} />;
    case 'cta':
      return (
        <CTASection
          headline={section.headline}
          buttonLabel={section.buttonLabel}
          buttonUrl={section.buttonUrl}
          urgencyText={section.urgencyText}
          onCtaClick={onCtaClick}
        />
      );
    default:
      return null;
  }
}
