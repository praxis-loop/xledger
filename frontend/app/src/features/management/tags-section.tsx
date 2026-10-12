import { Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { GroupedSection } from '@/components/ui/grouped-section'
import { InlineNameForm } from '@/components/ui/inline-name-form'
import type { TagItem } from '@/features/management/management-api'
import { useCreateTag, useDeleteTag, useManagementOverview } from '@/features/management/management-hooks'
import { getFriendlyApiErrorMessage } from '@/lib/api'
import { ListLoadError, ListRowsSkeleton, ROW_ICON_BUTTON_CLASS } from './section-states'

const PREVIEW_COUNT = 8

export function TagsSection() {
  const { t } = useTranslation()
  const { tagsQuery } = useManagementOverview({ includeCategories: false })
  const createTagMutation = useCreateTag()
  const deleteTagMutation = useDeleteTag()

  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<TagItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const tags = tagsQuery.data?.items ?? []
  const normalizedQuery = query.trim().toLowerCase()
  const filtered = normalizedQuery ? tags.filter((tag) => tag.name.toLowerCase().includes(normalizedQuery)) : tags
  const visible = showAll || normalizedQuery ? filtered : filtered.slice(0, PREVIEW_COUNT)
  const hiddenCount = filtered.length - visible.length

  async function handleCreate(name: string) {
    setCreateError(null)
    try {
      await createTagMutation.mutateAsync({ name })
      setCreating(false)
      setQuery('')
    } catch (error) {
      setCreateError(t('settingsPage.tags.failed', { message: getFriendlyApiErrorMessage(error, t) }))
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return
    setDeleteError(null)
    try {
      await deleteTagMutation.mutateAsync(pendingDelete.id)
      setPendingDelete(null)
    } catch (error) {
      setDeleteError(t('settingsPage.tags.failed', { message: getFriendlyApiErrorMessage(error, t) }))
    }
  }

  return (
    <GroupedSection
      id="settings-tags"
      title={t('settingsPage.tags.title', { count: tags.length })}
      description={t('settingsPage.tags.description')}
      action={
        <Button
          variant="secondary"
          className="min-h-11 px-3 text-[13px] md:min-h-9"
          onClick={() => {
            setCreateError(null)
            setCreating(true)
          }}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          {t('settingsPage.tags.new')}
        </Button>
      }
    >
      {tags.length > PREVIEW_COUNT ? (
        <div className="border-b border-black/10 p-3">
          <label className="relative block">
            <span className="sr-only">{t('settingsPage.tags.search')}</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-tertiary" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('settingsPage.tags.searchPlaceholder')}
              className="h-11 w-full rounded-lg border border-black/10 bg-ground pl-9 pr-3 text-sm text-ink transition placeholder:text-ink-tertiary focus:border-action focus:bg-white focus:outline-none focus:ring-1 focus:ring-action motion-reduce:transition-none"
            />
          </label>
        </div>
      ) : null}

      {creating ? (
        <div className={tags.length > 0 ? 'border-b border-black/10' : undefined}>
          <InlineNameForm
            label={t('settingsPage.tags.name')}
            submitLabel={t('settingsPage.tags.save')}
            pending={createTagMutation.isPending}
            error={createError}
            onSubmit={(name) => void handleCreate(name)}
            onCancel={() => {
              setCreating(false)
              setCreateError(null)
            }}
          />
        </div>
      ) : null}

      {tagsQuery.isPending ? <ListRowsSkeleton rows={2} /> : null}
      {tagsQuery.isError && !tagsQuery.data ? (
        <ListLoadError error={tagsQuery.error} onRetry={() => void tagsQuery.refetch()} retrying={tagsQuery.isFetching} />
      ) : null}
      {tagsQuery.isSuccess && visible.length === 0 && !creating ? (
        <p className="px-4 py-4 text-sm leading-6 text-ink-secondary">
          {normalizedQuery ? t('settingsPage.tags.noMatches') : t('settingsPage.tags.empty')}
        </p>
      ) : null}

      {visible.length > 0 ? (
        <ul className="divide-y divide-black/10">
          {visible.map((tag) => (
            <li key={tag.id} className="flex min-h-12 items-center gap-1 pl-4 pr-2">
              <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{tag.name}</span>
              <button
                type="button"
                aria-label={t('settingsPage.tags.removeLabel', { name: tag.name })}
                className={`${ROW_ICON_BUTTON_CLASS} hover:!bg-error-container hover:!text-error`}
                onClick={() => {
                  setDeleteError(null)
                  setPendingDelete(tag)
                }}
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {hiddenCount > 0 || (showAll && !normalizedQuery && filtered.length > PREVIEW_COUNT) ? (
        <div className="border-t border-black/10">
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-center px-4 text-[13px] font-semibold text-action transition hover:bg-action-tint focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action motion-reduce:transition-none"
            onClick={() => setShowAll((current) => !current)}
          >
            {showAll ? t('settingsPage.tags.showLess') : t('settingsPage.tags.showAll', { count: filtered.length })}
          </button>
        </div>
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title={t('settingsPage.tags.deleteConfirmTitle', { name: pendingDelete.name })}
          description={t('settingsPage.tags.deleteConfirmBody')}
          confirmLabel={t('settingsPage.tags.delete')}
          pending={deleteTagMutation.isPending}
          error={deleteError}
          onConfirm={() => void handleDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </GroupedSection>
  )
}
