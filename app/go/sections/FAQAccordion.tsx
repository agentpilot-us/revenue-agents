'use client';

import { useState } from 'react';

type FAQItem = {
  question: string;
  answer: string;
};

type Props = {
  items: FAQItem[];
};

export function FAQAccordion({ items }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-2">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-5">
        Frequently Asked Questions
      </h2>
      <div className="space-y-2">
        {items.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={i}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700/60 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-100 pr-4">
                  {item.question}
                </span>
                <svg
                  className={`w-5 h-5 text-zinc-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 bg-white dark:bg-zinc-800/50">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
