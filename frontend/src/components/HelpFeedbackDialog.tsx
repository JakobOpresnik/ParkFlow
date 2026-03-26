import { CheckCircle, Loader2 } from 'lucide-react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { useCreateFeedback } from '@/hooks/useFeedback'
import type { FeedbackCategory } from '@/types'

interface HelpFeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HelpFeedbackDialog({
  open,
  onOpenChange,
}: HelpFeedbackDialogProps) {
  const { t } = useTranslation()
  const createFeedback = useCreateFeedback()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<FeedbackCategory>('general')
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState({ title: false, description: false })

  const categoryOptions = [
    { value: 'general', label: t('feedback.categoryGeneral') },
    { value: 'bug', label: t('feedback.categoryBug') },
    { value: 'feature', label: t('feedback.categoryFeature') },
    { value: 'improvement', label: t('feedback.categoryImprovement') },
  ]

  function resetForm() {
    setTitle('')
    setDescription('')
    setCategory('general')
    setSubmitted(false)
    setTouched({ title: false, description: false })
  }

  function handleOpenChange(open: boolean) {
    if (!open) resetForm()
    onOpenChange(open)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched({ title: true, description: true })
    if (!title.trim() || !description.trim()) return

    try {
      await createFeedback.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        category,
      })
      setSubmitted(true)
    } catch {
      // error is available via createFeedback.isError
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto text-sm">
        <DialogHeader className="pb-2">
          <DialogTitle>{t('feedback.helpAndFeedback')}</DialogTitle>
        </DialogHeader>

        {/* Support contact section */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold">
            {t('feedback.supportTitle')}
          </h3>
          <p className="text-muted-foreground mt-1 text-xs">
            {t('feedback.supportDesc')}
          </p>
          <div className="bg-border my-3 h-px" />
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {[
              { name: 'Jakob Oprešnik', email: 'jakob.opresnik@acex.si' },
              { name: 'Jan Sernec', email: 'jan.sernec@acex.si' },
              { name: 'Aljaž Konečnik', email: 'aljaz.konecnik@acex.si' },
            ].map((admin) => (
              <React.Fragment key={admin.email}>
                <span className="font-medium">{admin.name}</span>
                <span className="flex items-center gap-2.5">
                  <span
                    className="bg-primary/40 shrink-0 rounded-full"
                    style={{ width: 3, height: 3 }}
                  />
                  <a
                    href={`mailto:${admin.email}`}
                    className="text-primary hover:underline"
                  >
                    {admin.email}
                  </a>
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Feature request form */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold">
            {t('feedback.featureRequestTitle')}
          </h3>
          <p className="text-muted-foreground mt-1 text-xs">
            {t('feedback.featureRequestDesc')}
          </p>

          {submitted ? (
            <div className="mt-4 flex flex-col items-center gap-3 rounded-lg bg-green-50 py-5 dark:bg-green-950/30">
              <CheckCircle className="size-8 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-700 dark:text-green-400">
                {t('feedback.submitted')}
              </p>
              <Button
                variant="outline"
                color="teal"
                onClick={() => handleOpenChange(false)}
              >
                {t('common.close')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium">
                  {t('feedback.titleLabel')}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, title: true }))}
                  placeholder={t('feedback.titlePlaceholder')}
                  className={`mt-1 h-8 w-full rounded-md border px-2.5 text-xs focus-visible:ring-1 focus-visible:outline-none ${
                    touched.title && !title.trim()
                      ? 'border-red-400 focus-visible:ring-red-300'
                      : 'border-input'
                  } bg-background placeholder:text-muted-foreground/40`}
                />
                {touched.title && !title.trim() && (
                  <p className="mt-1 text-xs text-red-500">
                    {t('feedback.titleRequired')}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium">
                  {t('feedback.descriptionLabel')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() =>
                    setTouched((p) => ({ ...p, description: true }))
                  }
                  placeholder={t('feedback.descriptionPlaceholder')}
                  rows={3}
                  className={`mt-1 w-full resize-none rounded-md border px-2.5 py-1.5 text-xs focus-visible:ring-1 focus-visible:outline-none ${
                    touched.description && !description.trim()
                      ? 'border-red-400 focus-visible:ring-red-300'
                      : 'border-input'
                  } bg-background placeholder:text-muted-foreground/40`}
                />
                {touched.description && !description.trim() && (
                  <p className="mt-1 text-xs text-red-500">
                    {t('feedback.descriptionRequired')}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium">
                  {t('feedback.categoryLabel')}
                </label>
                <div className="mt-1">
                  <Select
                    data={categoryOptions}
                    value={category}
                    onChange={(val) => {
                      if (val) setCategory(val as FeedbackCategory)
                    }}
                  />
                </div>
              </div>

              {createFeedback.isError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {t('feedback.submitFailed')}
                </p>
              )}

              <Button
                type="submit"
                className="mt-2 w-full"
                disabled={
                  createFeedback.isPending ||
                  !title.trim() ||
                  !description.trim()
                }
              >
                {createFeedback.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {t('feedback.submitting')}
                  </>
                ) : (
                  t('feedback.submit')
                )}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
