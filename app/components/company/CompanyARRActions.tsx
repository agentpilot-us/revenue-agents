'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { calculateProductFit } from '@/app/actions/calculate-product-fit';

type Props = {
  companyId: string;
};

export function CompanyARRActions({ companyId }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleCalculate = () => {
    startTransition(async () => {
      try {
        await calculateProductFit(companyId, true);
        window.location.reload();
      } catch {
        // Error could be shown via toast
      }
    });
  };

  return (
    <div className="mt-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCalculate}
        disabled={isPending}
      >
        {isPending ? 'Calculating…' : 'Calculate →'}
      </Button>
    </div>
  );
}
