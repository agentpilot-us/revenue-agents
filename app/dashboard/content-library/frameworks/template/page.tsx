import Link from 'next/link';

export default function FrameworksTemplatePage() {
  const sampleText = `# Discovery Framework

## Opening
- Start with the customer's current state and goals.
- Ask about priorities for the quarter.

## Value proposition
- Lead with outcomes (e.g. time to market, cost savings).
- Tie to their industry use cases.

## Objection handling
- "Price": Focus on TCO and ROI.
- "Timeline": Offer pilot or phased rollout.

## Closing
- Summarize next steps and owners.
- Set follow-up meeting.`;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link
        href="/dashboard/content-library?tab=Framework"
        className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
      >
        ← Back to Frameworks
      </Link>

      <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
        Framework template guide
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Use the <strong>Upload manually</strong> flow to paste or type your sales framework. The AI will extract structure (sections, messaging, objection handling) so the framework can be used in outreach.
      </p>

      <div className="space-y-6">
        <section className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-gray-200 dark:border-zinc-700">
          <h2 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">
            What to include
          </h2>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
            <li><strong>Framework name</strong> (e.g. Discovery Framework, Value Prop by Department)</li>
            <li><strong>Sections</strong> (e.g. Opening, Value proposition, Objection handling, Closing)</li>
            <li><strong>Key messaging</strong> or talking points under each section</li>
            <li>Optional: department or persona this framework applies to</li>
          </ul>
        </section>

        <section className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-gray-200 dark:border-zinc-700">
          <h2 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">
            Sample (copy and paste into Upload manually)
          </h2>
          <pre className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-zinc-900 p-4 rounded overflow-x-auto whitespace-pre-wrap font-sans">
            {sampleText}
          </pre>
        </section>

        <div className="flex gap-4">
          <Link href="/dashboard/content-library/import?type=Framework">
            <button className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600">
              Upload manually
            </button>
          </Link>
          <Link href="/dashboard/content-library?tab=Framework">
            <button className="px-6 py-3 border border-gray-300 dark:border-zinc-600 rounded hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200">
              Back to Frameworks
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
