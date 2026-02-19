'use client';

type Props = {
  currentContent: Record<string, unknown>;
  previousContent: Record<string, unknown>;
};

export function ContentDiffView({ currentContent, previousContent }: Props) {
  const getMarkdown = (content: Record<string, unknown>): string => {
    if (typeof content.markdown === 'string') return content.markdown;
    if (typeof content.fullText === 'string') return content.fullText;
    return '';
  };

  const getDescription = (content: Record<string, unknown>): string => {
    if (typeof content.description === 'string') return content.description;
    return '';
  };

  const currentMarkdown = getMarkdown(currentContent);
  const previousMarkdown = getMarkdown(previousContent);
  const currentDesc = getDescription(currentContent);
  const previousDesc = getDescription(previousContent);

  const hasMarkdownChanges = currentMarkdown !== previousMarkdown;
  const hasDescChanges = currentDesc !== previousDesc;

  if (!hasMarkdownChanges && !hasDescChanges) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-5">
        <p className="text-gray-600 dark:text-gray-300">No significant changes detected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {hasDescChanges && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Description Changes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">Previous</h3>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {previousDesc || '(empty)'}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">Current</h3>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {currentDesc || '(empty)'}
              </div>
            </div>
          </div>
        </div>
      )}

      {hasMarkdownChanges && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Content Changes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">Previous</h3>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-96 overflow-y-auto">
                {previousMarkdown || '(empty)'}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">Current</h3>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-96 overflow-y-auto">
                {currentMarkdown || '(empty)'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
