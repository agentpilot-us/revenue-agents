import Link from 'next/link';
import { programs } from '@/lib/programs';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Programs - Revenue Agents',
  description: 'Browse all AI-powered GTM growth motion programs',
};

export default function AllProgramsPage() {
  // Flatten all programs from all categories
  const allPrograms = programs.flatMap(category => 
    category.programs.map(program => ({
      ...program,
      categoryName: category.name,
      categorySlug: category.slug,
      colorTheme: category.colorTheme,
    }))
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white pt-20 pb-16">
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
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              All Programs
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Browse all {allPrograms.length} AI-powered GTM growth motion programs across {programs.length} categories
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              View Pricing & Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Programs by Category */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {programs.map((category) => (
            <div key={category.slug} className="mb-16">
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-16 h-16 ${category.colorTheme.iconBg} rounded-xl flex items-center justify-center`}>
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {category.name}
                  </h2>
                  <p className="text-lg text-gray-600">
                    {category.shortDescription}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.programs.map((program, idx) => (
                  <Link
                    key={idx}
                    href={`/programs/${category.slug}/${program.slug}`}
                    className="block"
                  >
                    <div className={`bg-white rounded-xl p-6 border-2 ${category.colorTheme.border} hover:shadow-lg transition-all h-full flex flex-col`}>
                      <div className="flex items-start gap-3 mb-4">
                        <div className={`w-10 h-10 ${category.colorTheme.iconBg} rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {program.name}
                          </h3>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-4 flex-1">
                        <strong className="text-gray-900">Who It&apos;s For:</strong> {program.whoItsFor}
                      </p>

                      <div className="mb-4">
                        <h4 className="font-semibold text-gray-900 mb-1 text-xs">Core Business Outcome</h4>
                        <p className="text-gray-600 text-xs">{program.coreOutcome}</p>
                      </div>

                      {program.exampleAgents && program.exampleAgents.length > 0 && (
                        <div className="mb-4">
                          <div className="flex flex-wrap gap-1.5">
                            {program.exampleAgents.slice(0, 2).map((agent, agentIdx) => (
                              <span
                                key={agentIdx}
                                className={`inline-block ${category.colorTheme.iconBg} text-white px-2 py-1 rounded text-xs font-medium`}
                              >
                                {agent}
                              </span>
                            ))}
                            {program.exampleAgents.length > 2 && (
                              <span className="text-xs text-gray-500">+{program.exampleAgents.length - 2} more</span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className={`text-sm ${category.colorTheme.checkColor} font-semibold mt-auto`}>
                        View Details →
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Build Your POC Demo?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Get access to all {allPrograms.length} programs, deployable code, and AI agents to jump-start your full implementation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-blue-600 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              View Pricing & Get Started
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
