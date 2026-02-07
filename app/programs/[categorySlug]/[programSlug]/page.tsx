import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProgramDetail, getProgramBySlug } from '@/lib/programs';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { categorySlug: string; programSlug: string } }): Promise<Metadata> {
  const result = getProgramDetail(params.categorySlug, params.programSlug);
  if (!result) {
    return {
      title: 'Program Not Found',
    };
  }
  return {
    title: `${result.program.name} - ${result.category.name} - Revenue Agents`,
    description: result.program.coreOutcome,
  };
}

export default function ProgramDetailPage({ params }: { params: { categorySlug: string; programSlug: string } }) {
  const result = getProgramDetail(params.categorySlug, params.programSlug);

  if (!result) {
    notFound();
  }

  const { category, program } = result;
  const colors = category.colorTheme;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className={`bg-gradient-to-b ${colors.gradient} pt-20 pb-16`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link
              href={`/programs/${category.slug}`}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-2"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to {category.name}
            </Link>
            <Link
              href="/"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 text-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>
          </div>
          
          <div className="text-center max-w-4xl mx-auto">
            <div className={`inline-block ${colors.iconBg} rounded-xl p-4 mb-6`}>
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="mb-4">
              <span className={`inline-block ${colors.iconBg} text-white px-4 py-2 rounded-lg text-sm font-medium mb-4`}>
                {category.name}
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              {program.name}
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              {program.coreOutcome}
            </p>
            <Link
              href="/pricing"
              className={`inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white ${colors.button} rounded-lg transition-colors shadow-lg hover:shadow-xl`}
            >
              View Pricing & Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Details Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`bg-white rounded-2xl p-8 shadow-lg border-2 ${colors.border}`}>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Who It&apos;s For</h2>
              <p className="text-lg text-gray-600">{program.whoItsFor}</p>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Primary Channel / Motion</h2>
              <p className="text-lg text-gray-600">{program.primaryChannel}</p>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Core Business Outcome</h2>
              <p className="text-lg text-gray-600">{program.coreOutcome}</p>
            </div>

            {program.exampleAgents && program.exampleAgents.length > 0 && (
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Example Agentforce Agents</h2>
                <div className="flex flex-wrap gap-3">
                  {program.exampleAgents.map((agent, agentIdx) => (
                    <span
                      key={agentIdx}
                      className={`inline-block ${colors.iconBg} text-white px-5 py-3 rounded-lg text-base font-medium`}
                    >
                      {agent}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {program.keyDataSignals && program.keyDataSignals.length > 0 && (
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Key Data Signals in Salesforce / Data Cloud</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {program.keyDataSignals.map((signal, signalIdx) => (
                    <div
                      key={signalIdx}
                      className="flex items-start gap-3 text-base text-gray-700 bg-gray-50 p-4 rounded-lg"
                    >
                      <svg className={`w-6 h-6 ${colors.checkColor} mt-0.5 flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>{signal}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            Get access to this program and all other programs in {category.name}, plus deployable code and AI agents to jump-start your full implementation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/pricing"
              className={`inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white ${colors.button} rounded-lg transition-colors shadow-lg hover:shadow-xl`}
            >
              View Pricing & Get Started
            </Link>
            <Link
              href={`/programs/${category.slug}`}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              View All {category.name} Programs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
