import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ArrowLeft, CheckCircle, Upload } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { importCSVConfirm, importCSVPreview } from '@/features/management/management-api'
import type { ImportPreviewResponse } from '@/features/management/management-api'

type ImportStep = 'upload' | 'mapping' | 'result'
type ImportLocationState = { from?: '/me' | '/transactions' }

const importSteps: ImportStep[] = ['upload', 'mapping', 'result']

export function ImportPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const previewMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await importCSVPreview(formData)
      return response
    },
    onSuccess: (data) => {
      setPreview(data)
      setMapping(data.suggested_mapping || {})
      setStep('mapping')
    },
  })

  const confirmMutation = useMutation({
    mutationFn: async (currentMapping: Record<string, string>) => {
      const formData = new FormData()
      if (file) formData.append('file', file)
      formData.append('mapping', JSON.stringify(currentMapping))
      const response = await importCSVConfirm(formData)
      return response
    },
    onSuccess: () => {
      setStep('result')
    },
  })

  const submitFile = (selectedFile: File) => {
    setFile(selectedFile)
    const formData = new FormData()
    formData.append('file', selectedFile)
    previewMutation.mutate(formData)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) submitFile(selectedFile)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const droppedFile = event.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.endsWith('.csv')) submitFile(droppedFile)
  }

  const locationState = location.state as ImportLocationState | null
  const handleBack = () => {
    navigate(locationState?.from === '/transactions' ? '/transactions' : '/me')
  }
  const resetImportFlow = () => {
    setStep('upload')
    setFile(null)
    setPreview(null)
    setMapping({})
    previewMutation.reset()
    confirmMutation.reset()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  const activeStepIndex = importSteps.indexOf(step)

  return (
    <div className="mx-auto max-w-2xl space-y-5 min-[1000px]:space-y-6">
      <header className="space-y-3">
        <Button
          variant="ghost"
          className="min-h-11 px-0 text-on-surface-variant hover:bg-transparent hover:text-primary min-[1000px]:hidden"
          onClick={handleBack}
        >
          <ArrowLeft aria-hidden="true" size={20} />
          {t('import.back')}
        </Button>
        <h1
          data-testid="import-page-title"
          className="text-[32px] font-bold leading-tight tracking-tight min-[1000px]:text-2xl"
        >
          {t('import.title')}
        </h1>
      </header>

      <ol
        aria-label={t('import.progressLabel')}
        data-ui="ios-import-stepper"
        className="grid grid-cols-3 gap-2 min-[1000px]:hidden"
      >
        {importSteps.map((stepName, index) => {
          const labelKey = stepName === 'upload'
            ? 'import.stepUpload'
            : stepName === 'mapping'
              ? 'import.stepMapping'
              : 'import.stepResult'
          const isActive = index === activeStepIndex
          const isComplete = index < activeStepIndex

          return (
            <li
              key={stepName}
              aria-current={isActive ? 'step' : undefined}
              className="min-w-0 space-y-2"
            >
              <span
                aria-hidden="true"
                className={`block h-1.5 rounded-full ${isActive || isComplete ? 'bg-primary' : 'bg-surface-container-highest'}`}
              />
              <span className={`block truncate text-xs font-semibold ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
                {t(labelKey)}
              </span>
            </li>
          )
        })}
      </ol>

      {step === 'upload' && (
        <>
          <div
            data-testid="compact-import-dropzone"
            data-ui="ios-compact-upload"
            className="flex min-h-[190px] max-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-outline/30 px-5 py-6 text-center transition-colors hover:border-primary min-[1000px]:min-h-0 min-[1000px]:max-h-none min-[1000px]:p-12"
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mb-3 h-10 w-10 text-on-surface-variant min-[1000px]:mb-4 min-[1000px]:h-12 min-[1000px]:w-12" aria-hidden="true" />
            <p className="text-base font-semibold min-[1000px]:text-lg">{t('import.selectFile')}</p>
            <p className="mt-1 text-sm text-on-surface-variant min-[1000px]:mt-2">{t('import.supportedFormats')}</p>
            <Button
              variant="secondary"
              className="mt-4 min-h-11 min-[1000px]:hidden"
              onClick={(event) => {
                event.stopPropagation()
                fileInputRef.current?.click()
              }}
            >
              {t('import.browse')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              aria-label={t('import.csvFileLabel')}
              className="hidden"
              onClick={(event) => event.stopPropagation()}
              onChange={handleFileChange}
            />
          </div>

          <section
            role="region"
            aria-labelledby="import-guidance-title"
            className="overflow-hidden rounded-2xl border border-outline/15 bg-surface-container-lowest min-[1000px]:hidden"
          >
            <h2 id="import-guidance-title" className="px-4 pb-2 pt-4 text-sm font-bold">
              {t('import.guidanceTitle')}
            </h2>
            {[
              ['csvTitle', 'csvDescription'],
              ['encodingTitle', 'encodingDescription'],
              ['privacyTitle', 'privacyDescription'],
            ].map(([title, description], index) => (
              <div
                key={title}
                className={`px-4 py-3 ${index > 0 ? 'border-t border-outline/10' : ''}`}
              >
                <h3 className="text-sm font-semibold">{t(`import.${title}`)}</h3>
                <p className="mt-0.5 text-sm text-on-surface-variant">{t(`import.${description}`)}</p>
              </div>
            ))}
          </section>
        </>
      )}

      {file && (
        <div className="flex min-w-0 items-center gap-2 rounded-xl bg-surface-container px-4 py-3 text-sm">
          <span className="shrink-0 font-semibold">{t('import.selectedFile')}</span>
          <span className="truncate text-on-surface-variant">{file.name}</span>
        </div>
      )}

      {previewMutation.isPending && (
        <div className="py-4 text-center" role="status">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <p className="mt-2 text-on-surface-variant">{t('common.loading')}</p>
        </div>
      )}

      {previewMutation.isError && (
        <div role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-red-700">
          <AlertCircle size={20} aria-hidden="true" />
          <p>{previewMutation.error instanceof Error ? previewMutation.error.message : t('errors.serverError')}</p>
        </div>
      )}

      {step === 'mapping' && preview && (
        <div className="space-y-5 min-[1000px]:space-y-6">
          <div className="rounded-xl bg-surface-container p-4">
            <p className="text-sm font-medium">
              {t('import.detectedFormat')}: <span className="text-primary">{preview.format}</span>
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-outline/15">
            <table className="w-full text-sm">
              <thead className="bg-surface-container">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  {preview.columns.slice(0, 5).map((heading) => (
                    <th key={heading} className="px-4 py-2 text-left">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.sample_rows.slice(0, 3).map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-outline/10">
                    <td className="px-4 py-2 text-on-surface-variant">#{rowIndex + 1}</td>
                    {row.slice(0, 5).map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-2">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">{t('import.fieldMapping')}</h3>
            {Object.entries(mapping).map(([field, csvColumn]) => (
              <div key={field} className="flex items-center gap-3 min-[1000px]:gap-4">
                <label className="w-28 text-sm font-medium min-[1000px]:w-32">{field}</label>
                <select
                  value={csvColumn}
                  onChange={(event) => setMapping({ ...mapping, [field]: event.target.value })}
                  className="min-h-11 min-w-0 flex-1 rounded-xl border border-outline/15 px-3 py-2 min-[1000px]:px-4"
                >
                  <option value="">--</option>
                  {preview.columns.map((heading) => (
                    <option key={heading} value={heading}>{heading}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex gap-3 min-[1000px]:gap-4">
            <button
              type="button"
              onClick={() => confirmMutation.mutate(mapping)}
              disabled={confirmMutation.isPending}
              className="min-h-11 flex-1 rounded-xl bg-primary py-3 font-semibold text-white disabled:opacity-50"
            >
              {confirmMutation.isPending ? t('common.loading') : t('import.confirm')}
            </button>
            <button
              type="button"
              onClick={resetImportFlow}
              className="min-h-11 flex-1 rounded-xl border border-outline/15 py-3"
            >
              {t('common.cancel')}
            </button>
          </div>

          {confirmMutation.isError && (
            <div role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-red-700">
              <AlertCircle size={20} aria-hidden="true" />
              <p>{confirmMutation.error instanceof Error ? confirmMutation.error.message : t('errors.serverError')}</p>
            </div>
          )}
        </div>
      )}

      {step === 'result' && confirmMutation.data && (
        <div className="space-y-5 py-4 text-center min-[1000px]:space-y-6 min-[1000px]:py-8">
          <CheckCircle className="mx-auto text-emerald-500" size={64} aria-hidden="true" />
          <h2 className="text-xl font-bold">{t('import.success')}</h2>
          <p className="text-on-surface-variant">
            {confirmMutation.data.success_count} {t('import.successRows')}
            {confirmMutation.data.skip_count > 0 && ` • ${confirmMutation.data.skip_count} ${t('import.skipped')}`}
            {confirmMutation.data.fail_count > 0 && ` • ${confirmMutation.data.fail_count} ${t('import.failed')}`}
          </p>
          <button
            type="button"
            onClick={resetImportFlow}
            className="min-h-11 rounded-xl bg-primary px-8 py-3 font-semibold text-white"
          >
            {t('import.importMore')}
          </button>
        </div>
      )}
    </div>
  )
}
