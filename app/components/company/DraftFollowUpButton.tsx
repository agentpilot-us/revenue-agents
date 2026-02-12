'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DraftFollowUpModal } from '@/app/components/company/DraftFollowUpModal';

type Props = {
  accountId: string;
  accountName: string;
  contactId?: string;
  contactName?: string | null;
  departmentId?: string;
  departmentName?: string | null;
};

export function DraftFollowUpButton({
  accountId,
  accountName,
  contactId,
  contactName,
  departmentId,
  departmentName,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <DraftFollowUpModal
      accountId={accountId}
      accountName={accountName}
      contactId={contactId}
      contactName={contactName}
      departmentId={departmentId}
      departmentName={departmentName}
      open={open}
      onClose={() => setOpen(false)}
      triggerButton={
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Draft follow-up email
        </Button>
      }
    />
  );
}
