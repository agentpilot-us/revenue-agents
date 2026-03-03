'use client';

type ValuePropItem = {
  icon?: string;
  title: string;
  body: string;
};

type Props = {
  items: ValuePropItem[];
};

export function ValuePropsGrid({ items }: Props) {
  return (
    <section className="py-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((item, i) => (
          <div
            key={i}
            className="group rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/50 p-5 transition-shadow hover:shadow-md"
          >
            {item.icon && (
              <span className="inline-block text-2xl mb-3" aria-hidden>
                {item.icon}
              </span>
            )}
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
              {item.title}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {item.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
