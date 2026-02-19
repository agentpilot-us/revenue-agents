'use client';

type Props = {
  isWarm: boolean;
};

export function WarmIndicator({ isWarm }: Props) {
  if (!isWarm) {
    return <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />;
  }

  return (
    <div
      className="w-2 h-2 rounded-full bg-green-500 animate-pulse"
      title="Warm contact - viewed landing page or clicked CTA"
    />
  );
}
