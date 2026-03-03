'use client';

type Step = {
  number: number;
  title: string;
  description: string;
};

type Props = {
  steps: Step[];
};

export function HowItWorksSection({ steps }: Props) {
  return (
    <section className="py-2">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6 text-center">
        How It Works
      </h2>
      <div className="relative">
        <div className="hidden sm:block absolute top-6 left-0 right-0 h-0.5 bg-zinc-200 dark:bg-zinc-700" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div key={step.number} className="relative text-center">
              <div className="relative z-10 mx-auto w-12 h-12 rounded-full bg-amber-500 text-zinc-900 font-bold text-lg flex items-center justify-center mb-3">
                {step.number}
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                {step.title}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
