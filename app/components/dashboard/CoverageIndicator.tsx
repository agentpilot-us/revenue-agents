'use client';

type Props = {
  research: boolean;
  contacts: boolean;
  pageLive: boolean;
  engaged: boolean;
};

export function CoverageIndicator({ research, contacts, pageLive, engaged }: Props) {
  const stages = [
    { key: 'research', label: 'Research', completed: research },
    { key: 'contacts', label: 'Contacts', completed: contacts },
    { key: 'pageLive', label: 'Page Live', completed: pageLive },
    { key: 'engaged', label: 'Engaged', completed: engaged },
  ];

  return (
    <div className="flex items-center gap-1.5" title={stages.filter(s => s.completed).map(s => s.label).join(', ') || 'No stages completed'}>
      {stages.map((stage, index) => (
        <div
          key={stage.key}
          className={`w-2 h-2 rounded-full transition-colors ${
            stage.completed
              ? 'bg-green-500 dark:bg-green-400'
              : 'bg-gray-300 dark:bg-gray-600'
          }`}
          title={stage.label}
          aria-label={`${stage.label}: ${stage.completed ? 'completed' : 'not completed'}`}
        />
      ))}
    </div>
  );
}
