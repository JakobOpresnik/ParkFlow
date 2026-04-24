import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Inbox, Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import {
  useDeleteFeedback,
  useFeedbackList,
  useUpdateFeedbackStatus,
} from '@/hooks/useFeedback'
import { useUIStore } from '@/store/uiStore'
import type { FeatureRequest, FeedbackStatus } from '@/types'

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  bug: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  feature:
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  improvement:
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'border-amber-400/50 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-950/20',
  in_progress:
    'border-blue-400/50 bg-blue-50/50 dark:border-blue-500/30 dark:bg-blue-950/20',
  done: 'border-green-400/50 bg-green-50/50 dark:border-green-500/30 dark:bg-green-950/20',
  dismissed:
    'border-gray-300/50 bg-gray-50/50 dark:border-gray-600/30 dark:bg-gray-900/20',
  archived:
    'border-slate-300/50 bg-slate-50/50 dark:border-slate-600/30 dark:bg-slate-900/20',
}

const STATUS_HEADER_COLORS: Record<string, string> = {
  open: 'text-amber-700 dark:text-amber-400',
  in_progress: 'text-blue-700 dark:text-blue-400',
  done: 'text-green-700 dark:text-green-400',
  dismissed: 'text-gray-500 dark:text-gray-400',
  archived: 'text-slate-500 dark:text-slate-400',
}

const STATUS_DOT: Record<string, string> = {
  open: 'bg-amber-500',
  in_progress: 'bg-blue-500',
  done: 'bg-green-500',
  dismissed: 'bg-gray-400',
  archived: 'bg-slate-500',
}

const STATUS_ORDER: FeedbackStatus[] = [
  'open',
  'in_progress',
  'done',
  'dismissed',
  'archived',
]

const STATUS_LABEL_KEYS: Record<FeedbackStatus, string> = {
  open: 'feedback.statusOpen',
  in_progress: 'feedback.statusInProgress',
  done: 'feedback.statusDone',
  dismissed: 'feedback.statusDismissed',
  archived: 'feedback.statusArchived',
}

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  general: 'feedback.categoryGeneral',
  bug: 'feedback.categoryBug',
  feature: 'feedback.categoryFeature',
  improvement: 'feedback.categoryImprovement',
}

export function AdminFeedbackPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setMoreOpen = useUIStore((s) => s.setMoreDrawerOpen)
  const { data: feedback, isLoading } = useFeedbackList()
  const updateStatus = useUpdateFeedbackStatus()
  const deleteFeedback = useDeleteFeedback()
  const [deleteTarget, setDeleteTarget] = useState<FeatureRequest | null>(null)

  const statusOptions = STATUS_ORDER.map((s) => ({
    value: s,
    label: t(STATUS_LABEL_KEYS[s]),
  }))

  function statusLabel(status: string) {
    return t(STATUS_LABEL_KEYS[status as FeedbackStatus] ?? status)
  }

  function categoryLabel(category: string) {
    return t(CATEGORY_LABEL_KEYS[category] ?? category)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="text-primary size-6 animate-spin" />
      </div>
    )
  }

  // Group feedback by status
  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: (feedback ?? []).filter((item) => item.status === status),
  })).filter((group) => group.items.length > 0)

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => {
            setMoreOpen(true)
            void navigate({ to: '/' })
          }}
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex cursor-pointer items-center gap-1 sm:hidden"
          style={{ fontSize: 12 }}
        >
          <ArrowLeft className="size-3.5" />
          {t('common.back')}
        </button>
        <h1 className="text-2xl font-semibold">{t('feedback.feedbackList')}</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {t('feedback.featureRequestTitle')}
        </p>
      </div>

      {!feedback?.length ? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <Inbox className="text-muted-foreground/40 size-12" />
          <p className="mt-3 text-sm font-medium">{t('feedback.noFeedback')}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t('feedback.noFeedbackDesc')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ status, items }) => (
            <StatusGroup
              key={status}
              status={status}
              label={statusLabel(status)}
              items={items}
              statusOptions={statusOptions}
              categoryLabel={categoryLabel}
              onStatusChange={(id, val) =>
                updateStatus.mutate({ id, status: val })
              }
              onDelete={(id) => {
                const item = feedback?.find((f) => f.id === id)
                if (item) setDeleteTarget(item)
              }}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('feedback.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {t('feedback.deleteConfirm')}
            <br />
            <span className="text-xs">{t('feedback.deleteWarning')}</span>
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              {t('admin.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  deleteFeedback.mutate(deleteTarget.id)
                  setDeleteTarget(null)
                }
              }}
            >
              {t('admin.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatusGroup({
  status,
  label,
  items,
  statusOptions,
  categoryLabel,
  onStatusChange,
  onDelete,
}: {
  status: string
  label: string
  items: FeatureRequest[]
  statusOptions: { value: string; label: string }[]
  categoryLabel: (c: string) => string
  onStatusChange: (id: string, status: FeedbackStatus) => void
  onDelete: (id: string) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`size-2 rounded-full ${STATUS_DOT[status] ?? 'bg-gray-400'}`}
        />
        <h2
          className={`text-sm font-semibold ${STATUS_HEADER_COLORS[status] ?? ''}`}
        >
          {label}
        </h2>
        <span className="text-muted-foreground text-xs">({items.length})</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg border p-4 ${STATUS_COLORS[item.status] ?? ''}`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[item.category] ?? ''}`}
                  >
                    {categoryLabel(item.category)}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                  {item.description}
                </p>
                <div className="bg-border mt-3 h-px" />
                <p className="text-muted-foreground mt-2 text-xs">
                  {item.display_name} &middot;{' '}
                  {new Date(item.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="w-40">
                  <Select
                    data={statusOptions}
                    value={item.status}
                    onChange={(val) => {
                      if (val) onStatusChange(item.id, val as FeedbackStatus)
                    }}
                  />
                </div>
                <button
                  onClick={() => onDelete(item.id)}
                  className="text-muted-foreground flex size-8 items-center justify-center rounded-md transition-colors hover:text-red-500"
                  title="Delete"
                >
                  <Trash2 className="size-4 cursor-pointer" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
