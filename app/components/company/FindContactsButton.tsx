'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FindContactsModal } from './FindContactsModal';

type Props = {
  companyId: string;
  companyName: string;
  departmentId: string;
  departmentName: string;
  existingContactNames: string[];
};

export function FindContactsButton({
  companyId,
  companyName,
  departmentId,
  departmentName,
  existingContactNames,
}: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Find Contacts with AI
      </Button>
      <FindContactsModal
        open={open}
        onOpenChange={setOpen}
        companyId={companyId}
        companyName={companyName}
        departmentId={departmentId}
        departmentName={departmentName}
        existingContactNames={existingContactNames}
        onAdded={() => router.refresh()}
      />
    </>
  );
}
