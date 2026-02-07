import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProgramBySlug, programs } from '@/lib/programs';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return programs.map((program) => ({
    categorySlug: program.slug,
  }));
}

export async function generateMetadata({ params }: { params: { categorySlug: string } }): Promise<Metadata> {
  const program = getProgramBySlug(params.categorySlug);
  if (!program) {
    return {
      title: 'Program Not Found',
    };
  }
  return {
    title: `${program.name} - Revenue Agents`,
    description: program.shortDescription,
  };
}

export default function ProgramDetailPage({ params }: { params: { categorySlug: string } }) {
  const program = getProgramBySlug(params.categorySlug);

  if (!program) {
    notFound();
  }

  const colors = program.colorTheme;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className={`bg-gradient-to-b ${colors.gradient} pt-20 pb-16`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          
          <div className="text-center max-w-4xl mx-auto">
            <div className={`inline-block ${colors.iconBg} rounded-xl p-4 mb-6`}>
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              {program.name}
            </h1>
            <p className="text-xl text-gray-600 mb-4">
              {program.shortDescription}
            </p>
            <p className="text-lg text-gray-500 mb-8">
              → Ideal for: {program.idealFor}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/pricing"
                className={`inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white ${colors.button} rounded-lg transition-colors shadow-lg hover:shadow-xl`}
              >
                View Pricing & Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What's Included Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              What&apos;s Included
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to build proof-of-concept (POC) demos for AI-powered GTM growth motions
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {program.features.map((feature, idx) => (
              <div
                key={idx}
                className={`bg-gradient-to-br ${colors.gradient} rounded-xl p-6 border ${colors.border}`}
              >
                <div className="flex items-start gap-3">
                  <svg className={`w-6 h-6 ${colors.checkColor} mt-0.5 flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-900 font-medium">{feature}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Programs Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {program.programs.length} Programs Included
            </h2>
            <p className="text-xl text-gray-600">
              Each program includes strategy, deployable code, AI agents, and data models
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {program.programs.map((prog, idx) => (
              <Link
                key={idx}
                href={`/programs/${program.slug}/${prog.slug}`}
                className="block"
              >
                <div className={`bg-white rounded-2xl p-6 shadow-lg border-2 ${colors.border} hover:shadow-xl transition-all h-full flex flex-col`}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 ${colors.iconBg} rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {prog.name}
                      </h3>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4 flex-1">
                    <strong>Who It&apos;s For:</strong> {prog.whoItsFor}
                  </p>

                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2 text-sm">Core Business Outcome</h4>
                    <p className="text-gray-600 text-sm">{prog.coreOutcome}</p>
                  </div>

                  {prog.exampleAgents && prog.exampleAgents.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {prog.exampleAgents.slice(0, 2).map((agent, agentIdx) => (
                          <span
                            key={agentIdx}
                            className={`inline-block ${colors.iconBg} text-white px-3 py-1 rounded-lg text-xs font-medium`}
                          >
                            {agent}
                          </span>
                        ))}
                        {prog.exampleAgents.length > 2 && (
                          <span className="text-xs text-gray-500">+{prog.exampleAgents.length - 2} more</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={`text-sm ${colors.checkColor} font-semibold mt-auto`}>
                    View Details →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-20 bg-gradient-to-r ${colors.gradient}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Build Your POC Demo?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Get access to all {program.programs.length} programs, deployable code, and AI agents to jump-start your full implementation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/pricing"
              className={`inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white ${colors.button} rounded-lg transition-colors shadow-lg hover:shadow-xl`}
            >
              View Pricing & Get Started
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
