import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { GroupedSection } from '@/components/ui/grouped-section'
import { InlineNameForm } from '@/components/ui/inline-name-form'
import { UndoToast } from '@/components/ui/undo-toast'
import type { CategoryItem } from '@/features/management/management-api'
import {
  useCreateCategory,
  useDeleteCategory,
  useManagementOverview,
  useUpdateCategory,
} from '@/features/management/management-hooks'
import { getFriendlyApiErrorMessage } from '@/lib/api'
import { ListLoadError, ListRowsSkeleton, ROW_ICON_BUTTON_CLASS } from './section-states'

const CATEGORY_PRIORITY = ['Lunch', 'Dinner', 'Breakfast', 'Coffee', 'Groceries', 'Transport', 'Rent', 'Utilities', 'Salary', 'Bonus', 'Investment', 'Travel']
const PREVIEW_COUNT = 8

function getCategoryPriority(name: string) {
  const index = CATEGORY_PRIORITY.findIndex((item) => item.toLowerCase() === name.toLowerCase())
  return index === -1 ? CATEGORY_PRIORITY.length : index
}

type RemovedCategory = { category: CategoryItem; archived: boolean }

export function CategoriesSection() {
  const { t } = useTranslation()
  const { categoriesQuery } = useManagementOverview({ includeTags: false })
  const createCategoryMutation = useCreateCategory()
  const updateCategoryMutation = useUpdateCategory()
  const deleteCategoryMutation = useDeleteCategory()

  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editingID, setEditingID] = useState<string | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)
  const [removed, setRemoved] = useState<RemovedCategory | null>(null)

  const categories = useMemo(
    () =>
      (categoriesQuery.data?.items ?? [])
        .filter((category) => !category.archived_at)
        .sort((a, b) => getCategoryPriority(a.name) - getCategoryPriority(b.name) || a.name.localeCompare(b.name)),
    [categoriesQuery.data?.items],
  )
  const normalizedQuery = query.trim().toLowerCase()
  const filtered = normalizedQuery ? categories.filter((category) => category.name.toLowerCase().includes(normalizedQuery)) : categories
  const visible = showAll || normalizedQuery ? filtered : filtered.slice(0, PREVIEW_COUNT)
  const hiddenCount = filtered.length - visible.length

  async function handleCreate(name: string) {
    setRowError(null)
    try {
      await createCategoryMutation.mutateAsync({ name })
      setCreating(false)
      setQuery('')
      setShowAll(true)
    } catch (error) {
      setRowError(t('settingsPage.categories.failed', { message: getFriendlyApiErrorMessage(error, t) }))
    }
  }

  async function handleRename(category: CategoryItem, name: string) {
    setRowError(null)
    if (name === category.name) {
      setEditingID(null)
      return
    }
    try {
      await updateCategoryMutation.mutateAsync({ id: category.id, name })
      setEditingID(null)
    } catch (error) {
      setRowError(t('settingsPage.categories.failed', { message: getFriendlyApiErrorMessage(error, t) }))
    }
  }

  async function handleRemove(category: CategoryItem) {
    setRowError(null)
    try {
      const result = await deleteCategoryMutation.mutateAsync(category.id)
      setRemoved({ category, archived: Boolean(result?.archived) })
    } catch (error) {
      setRowError(t('settingsPage.categories.failed', { message: getFriendlyApiErrorMessage(error, t) }))
    }
  }

  // Archived categories come back by un-archiving; unused ones were deleted outright, so recreate them by name.
  async function handleUndoRemove() {
    if (!removed) return
    try {
      if (removed.archived) {
        await updateCategoryMutation.mutateAsync({ id: removed.category.id, archived: false })
      } else {
        await createCategoryMutation.mutateAsync({ name: removed.category.name, parent_id: removed.category.parent_id })
      }
    } catch (error) {
      setRowError(t('settingsPage.categories.failed', { message: getFriendlyApiErrorMessage(error, t) }))
    } finally {
      setRemoved(null)
    }
  }

  return (
    <GroupedSection
      id="settings-categories"
      title={t('settingsPage.categories.title', { count: categories.length })}
      description={t('settingsPage.categories.description')}
      action={
        <Button
          variant="secondary"
          className="min-h-11 px-3 text-[13px] md:min-h-9"
          onClick={() => {
            setEditingID(null)
            setRowError(null)
            setCreating(true)
          }}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          {t('settingsPage.categories.new')}
        </Button>
      }
    >
      {categories.length > PREVIEW_COUNT ? (
        <div className="border-b border-black/10 p-3">
          <label className="relative block">
            <span className="sr-only">{t('settingsPage.categories.search')}</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-tertiary" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('settingsPage.categories.searchPlaceholder')}
              className="h-11 w-full rounded-lg border border-black/10 bg-ground pl-9 pr-3 text-sm text-ink transition placeholder:text-ink-tertiary focus:border-action focus:bg-white focus:outline-none focus:ring-1 focus:ring-action motion-reduce:transition-none"
            />
          </label>
        </div>
      ) : null}

      {creating ? (
        <div className="border-b border-black/10">
          <InlineNameForm
            label={t('settingsPage.categories.name')}
            submitLabel={t('settingsPage.categories.save')}
            pending={createCategoryMutation.isPending}
            error={rowError}
            onSubmit={(name) => void handleCreate(name)}
            onCancel={() => {
              setCreating(false)
              setRowError(null)
            }}
          />
        </div>
      ) : null}

      {categoriesQuery.isPending ? <ListRowsSkeleton /> : null}
      {categoriesQuery.isError && !categoriesQuery.data ? (
        <ListLoadError error={categoriesQuery.error} onRetry={() => void categoriesQuery.refetch()} retrying={categoriesQuery.isFetching} />
      ) : null}
      {categoriesQuery.isSuccess && visible.length === 0 ? (
        <p className="px-4 py-4 text-sm text-ink-secondary">
          {normalizedQuery ? t('settingsPage.categories.noMatches') : t('settingsPage.categories.empty')}
        </p>
      ) : null}
      {!creating && !editingID && rowError ? (
        <p role="alert" className="border-b border-black/10 px-4 py-2 text-xs font-medium text-error">
          {rowError}
        </p>
      ) : null}

      {visible.length > 0 ? (
        <ul className="divide-y divide-black/10">
          {visible.map((category) =>
            editingID === category.id ? (
              <li key={category.id}>
                <InlineNameForm
                  label={t('settingsPage.categories.name')}
                  submitLabel={t('settingsPage.categories.save')}
                  initialValue={category.name}
                  pending={updateCategoryMutation.isPending}
                  error={rowError}
                  onSubmit={(name) => void handleRename(category, name)}
                  onCancel={() => {
                    setEditingID(null)
                    setRowError(null)
                  }}
                />
              </li>
            ) : (
              <li key={category.id} className="flex min-h-12 items-center gap-1 pl-4 pr-2">
                <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{category.name}</span>
                <button
                  type="button"
                  aria-label={t('settingsPage.categories.renameLabel', { name: category.name })}
                  className={ROW_ICON_BUTTON_CLASS}
                  onClick={() => {
                    setCreating(false)
                    setRowError(null)
                    setEditingID(category.id)
                  }}
                >
                  <Pencil aria-hidden="true" className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={t('settingsPage.categories.removeLabel', { name: category.name })}
                  className={`${ROW_ICON_BUTTON_CLASS} hover:!bg-error-container hover:!text-error`}
                  disabled={deleteCategoryMutation.isPending}
                  onClick={() => void handleRemove(category)}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              </li>
            ),
          )}
        </ul>
      ) : null}

      {hiddenCount > 0 || (showAll && !normalizedQuery && filtered.length > PREVIEW_COUNT) ? (
        <div className="border-t border-black/10">
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-center px-4 text-[13px] font-semibold text-action transition hover:bg-action-tint focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action motion-reduce:transition-none"
            onClick={() => setShowAll((current) => !current)}
          >
            {showAll ? t('settingsPage.categories.showLess') : t('settingsPage.categories.showAll', { count: filtered.length })}
          </button>
        </div>
      ) : null}

      {removed ? (
        <UndoToast
          message={
            removed.archived
              ? t('settingsPage.categories.removedArchived', { name: removed.category.name })
              : t('settingsPage.categories.removedDeleted', { name: removed.category.name })
          }
          actionLabel={t('settingsPage.categories.undo')}
          pending={updateCategoryMutation.isPending || createCategoryMutation.isPending}
          onAction={() => void handleUndoRemove()}
          onDismiss={() => setRemoved(null)}
        />
      ) : null}
    </GroupedSection>
  )
}
