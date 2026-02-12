'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { StartExpansionPlayModal } from '@/app/components/company/StartExpansionPlayModal';

type Props = {
  companyId: string;
  companyName?: string;
  departmentId: string;
  departmentName?: string;
  productId: string;
  productName?: string;
  opportunitySize?: number;
  fitScore?: number;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  children?: React.ReactNode;
};

export function StartExpansionPlayButton({
  companyId,
  companyName = 'Account',
  departmentId,
  departmentName = 'Department',
  productId,
  productName,
  opportunitySize,
  fitScore,
  variant = 'default',
  size = 'sm',
  children,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <StartExpansionPlayModal
      companyId={companyId}
      companyName={companyName}
      departmentId={departmentId}
      departmentName={departmentName}
      productId={productId}
      productName={productName ?? ''}
      opportunitySize={opportunitySize}
      fitScore={fitScore}
      open={open}
      onClose={() => setOpen(false)}
      triggerButton={
        <Button
          variant={variant}
          size={size}
          onClick={(e) => { e.preventDefault(); setOpen(true); }}
        >
          {children ?? 'Start Expansion Play'}
        </Button>
      }
    />
  );
}
