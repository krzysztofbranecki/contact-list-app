'use client';

import { Button } from '@/components/ui/button';

/**
 * Delete button with a native confirmation dialog. The bound Server Action
 * (removeContact) re-checks the session — the confirm() is UX, not security.
 */
export function DeleteContactButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm('Usunąć ten kontakt? Usunie to również jego konto logowania.')) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="danger">
        Usuń
      </Button>
    </form>
  );
}