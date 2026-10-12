import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { DialogShell } from '@/components/ui/dialog-shell'

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  pending?: boolean
  error?: string | null
  destructive?: boolean
}

// Confirmation for actions that can't be undone in place. Both buttons name the action instead of "OK".
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  pending = false,
  error,
  destructive = true,
}: ConfirmDialogProps) {
  const { t } = useTranslation()

  return (
    <DialogShell
      title={title}
      description={description}
      onClose={pending ? undefined : onCancel}
      className="max-w-md"
      footer={
        <>
          <Button variant="ghost" className="min-h-11" onClick={onCancel} disabled={pending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            className="min-h-11"
            onClick={onConfirm}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? t('common.working') : confirmLabel}
          </Button>
        </>
      }
    >
      {error ? (
        <p role="alert" className="rounded-lg bg-error-container px-3 py-2 text-sm font-medium text-on-error-container">
          {error}
        </p>
      ) : null}
    </DialogShell>
  )
}
