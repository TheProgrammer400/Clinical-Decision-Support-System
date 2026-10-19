'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, AlertCircle, Download, FileText, MemoryStick, Rocket, Tag, Upload, User, X } from 'lucide-react';
import DoctorSidebar from '@/components/DoctorSidebar';
import { ApiError, apiClient } from '@/lib/api-client';
import { RequireAuth } from '@/lib/session';
import type { PatientContext } from '@/lib/types';
import { ACCEPTED_IMAGE_TYPES as ACCEPTED_TYPES, MAX_FILE_MB, MAX_FILES, validateCaseForm } from '@/lib/case-form';

const SELECT_CLASS =
  'w-full bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary';

type Choice<T extends keyof PatientContext> = PatientContext[T] | '';

export default function NewCasePage() {
  return (
    <RequireAuth roles={['DOCTOR']}>
      <NewCaseForm />
    </RequireAuth>
  );
}

function NewCaseForm() {
  const router = useRouter();
  const [caseText, setCaseText] = useState('');
  // No defaults: every clinically relevant attribute must be chosen explicitly.
  const [ageGroup, setAgeGroup] = useState<Choice<'ageGroup'>>('');
  const [sex, setSex] = useState<Choice<'sex'>>('');
  const [acuity, setAcuity] = useState<Choice<'acuity'>>('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [mriFiles, setMriFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Stable per form instance, so a retried submit cannot create a duplicate case.
  const [idempotencyKey] = useState(() => `case_${crypto.randomUUID().replace(/-/g, '')}`);

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().replace(/^,|,$/g, '').slice(0, 80);
      if (tag && !tags.includes(tag) && tags.length < 30) setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = '';
    for (const file of selected) {
      if (file.size > MAX_FILE_MB * 1024 * 1024) return setError(`'${file.name}' exceeds the ${MAX_FILE_MB} MB limit.`);
      if (!ACCEPTED_TYPES.includes(file.type)) return setError(`'${file.name}' is not a PNG, JPEG or WebP image.`);
    }
    if (mriFiles.length + selected.length > MAX_FILES) return setError(`At most ${MAX_FILES} images can be attached.`);
    setError(null);
    setMriFiles((prev) => [...prev, ...selected]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validateCaseForm({ caseText, ageGroup, sex, acuity });
    if (invalid) return setError(invalid);

    setError(null);
    setLoading(true);
    let caseId: string | null = null;
    try {
      setStep('Creating case record…');
      const created = await apiClient.createCase(caseText, { ageGroup, sex, acuity, historyTags: tags } as PatientContext, idempotencyKey);
      caseId = created.id;

      if (mriFiles.length > 0) {
        setStep(`Running image segmentation on ${mriFiles.length} file(s)…`);
        // Per-image failures are recorded on the case and shown on the next page.
        await apiClient.uploadMri(caseId, mriFiles);
      }

      setStep('Requesting decision-support analysis…');
      await apiClient.analyzeCase(caseId);
      router.push(`/cases/${caseId}`);
    } catch (err) {
      if (caseId) {
        // The case exists; its page shows exactly what succeeded and what failed.
        router.push(`/cases/${caseId}`);
        return;
      }
      setError(err instanceof ApiError ? err.message : 'The case could not be created. Please retry.');
      setLoading(false);
      setStep(null);
    }
  };

  const loadSample = () => {
    setCaseText(
      'SYNTHETIC TRAINING EXAMPLE. 54-year-old presenting with sudden onset left-sided weakness and aphasia beginning approximately 2 hours prior to arrival. Progressive morning headache over 3 weeks. Non-contrast CT: hypodense area in the right frontal lobe with partial ventricular effacement. Melanoma resected 5 years ago.',
    );
    setAgeGroup('adult');
    setSex('m');
    setAcuity('hyperacute');
    setTags(['Prior melanoma']);
  };

  return (
    <div className="flex min-h-screen bg-background text-on-surface font-body antialiased">
      <DoctorSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 px-8 py-5 border-b border-outline-variant bg-surface">
          <div>
            <h1 className="text-xl font-headline font-bold text-on-surface tracking-tight">New Clinical Case Evaluation</h1>
            <p className="text-sm text-on-surface-variant mt-1">Enter the patient context and narrative. Only what you enter is sent for analysis.</p>
          </div>
          <button type="button" onClick={loadSample} className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded text-sm font-medium">
            <Download className="h-4 w-4 text-primary" aria-hidden="true" />
            Load synthetic example
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            {error && (
              <div role="alert" className="p-4 bg-error-container/40 border border-error/30 rounded-lg flex items-start gap-3 text-on-error-container text-sm">
                <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <form id="clinical-case-form" onSubmit={handleSubmit} className="space-y-8" noValidate>
              <fieldset className="bg-surface-container rounded-lg border border-outline-variant p-6 space-y-6">
                <legend className="text-base font-semibold text-on-surface flex items-center gap-2 px-1">
                  <User className="h-4 w-4 text-primary" aria-hidden="true" />
                  Structured Patient Context
                </legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <label className="space-y-2 block text-xs font-medium text-on-surface-variant">
                    Age group (required)
                    <select required value={ageGroup} onChange={(e) => setAgeGroup(e.target.value as Choice<'ageGroup'>)} className={SELECT_CLASS}>
                      <option value="">Select…</option>
                      <option value="pediatric">Pediatric (0-17)</option>
                      <option value="adult">Adult (18-64)</option>
                      <option value="geriatric">Geriatric (65+)</option>
                      <option value="not_specified">Not specified</option>
                    </select>
                  </label>
                  <label className="space-y-2 block text-xs font-medium text-on-surface-variant">
                    Sex (required)
                    <select required value={sex} onChange={(e) => setSex(e.target.value as Choice<'sex'>)} className={SELECT_CLASS}>
                      <option value="">Select…</option>
                      <option value="m">Male</option>
                      <option value="f">Female</option>
                      <option value="other">Other/undetermined</option>
                      <option value="not_specified">Not specified</option>
                    </select>
                  </label>
                  <label className="space-y-2 block text-xs font-medium text-on-surface-variant">
                    Onset acuity (required)
                    <select required value={acuity} onChange={(e) => setAcuity(e.target.value as Choice<'acuity'>)} className={SELECT_CLASS}>
                      <option value="">Select…</option>
                      <option value="hyperacute">Hyperacute (&lt; 24h)</option>
                      <option value="acute">Acute (1-7 days)</option>
                      <option value="subacute">Subacute (1-4 weeks)</option>
                      <option value="chronic">Chronic (&gt; 4 weeks)</option>
                      <option value="not_specified">Not specified</option>
                    </select>
                  </label>
                </div>

                <div className="space-y-2">
                  <label htmlFor="history-tags" className="block text-xs font-medium text-on-surface-variant">
                    Relevant history (optional; press Enter or comma to add)
                  </label>
                  <input
                    id="history-tags"
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={addTag}
                    placeholder="e.g. Type 2 diabetes"
                    className="w-full bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-sm text-on-surface"
                  />
                  {tags.length > 0 && (
                    <ul className="flex flex-wrap gap-2 mt-3" aria-label="History entries">
                      {tags.map((t) => (
                        <li key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-variant border border-outline-variant text-xs font-mono">
                          <Tag className="h-3 w-3 text-primary" aria-hidden="true" />
                          {t}
                          <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="hover:text-error">
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </fieldset>

              <section className="bg-surface-container rounded-lg border border-outline-variant p-6 space-y-4">
                <h2 className="text-base font-semibold text-on-surface flex items-center gap-2">
                  <MemoryStick className="h-4 w-4 text-primary" aria-hidden="true" />
                  Brain MRI images <span className="text-xs font-normal text-on-surface-variant">(optional)</span>
                </h2>
                <label className="border-2 border-dashed border-outline-variant hover:border-primary/50 rounded-lg bg-surface-container-lowest p-8 flex flex-col items-center justify-center text-center cursor-pointer">
                  <Upload className="h-6 w-6 text-primary mb-3" aria-hidden="true" />
                  <span className="text-sm font-medium text-on-surface mb-1">Attach 2D image slices</span>
                  <span className="text-xs text-on-surface-variant max-w-sm">
                    PNG, JPEG or WebP; up to {MAX_FILES} files of {MAX_FILE_MB} MB. DICOM is not supported. Segmentation is automated and unvalidated.
                  </span>
                  <input type="file" multiple accept={ACCEPTED_TYPES.join(',')} onChange={handleFileChange} className="sr-only" />
                </label>
                {mriFiles.length > 0 && (
                  <ul className="flex flex-wrap gap-2 pt-2" aria-label="Attached images">
                    {mriFiles.map((file, idx) => (
                      <li key={`${file.name}-${idx}`} className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-container-low border border-primary/30 rounded text-xs text-primary font-mono">
                        {file.name} <span className="text-on-surface-variant">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                        <button type="button" onClick={() => setMriFiles(mriFiles.filter((_, i) => i !== idx))} aria-label={`Remove ${file.name}`} className="hover:text-error">
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="bg-surface-container rounded-lg border border-outline-variant p-6 space-y-4">
                <h2 className="text-base font-semibold text-on-surface flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                  Clinical Case Narrative
                </h2>
                <label htmlFor="case-text" className="block text-xs font-medium text-on-surface-variant">
                  History of present illness and findings (required)
                </label>
                <textarea
                  id="case-text"
                  required
                  rows={8}
                  maxLength={20000}
                  value={caseText}
                  onChange={(e) => setCaseText(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-sm font-mono text-on-surface resize-y leading-relaxed"
                />
              </section>
            </form>

            {loading && step && (
              <div role="status" aria-live="polite" className="p-4 bg-surface-container border border-primary/30 rounded-lg flex items-center gap-3">
                <Activity className="h-5 w-5 text-primary animate-spin" aria-hidden="true" />
                <span className="text-sm text-primary font-medium">{step}</span>
              </div>
            )}
          </div>
        </div>

        <footer className="p-6 border-t border-outline-variant bg-surface">
          <div className="max-w-5xl mx-auto flex justify-end">
            <button
              type="submit"
              form="clinical-case-form"
              disabled={loading}
              className="flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary px-6 py-3 rounded-md text-sm font-semibold disabled:opacity-50"
            >
              {loading ? <Activity className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Rocket className="h-4 w-4" aria-hidden="true" />}
              {loading ? 'Processing…' : 'Run decision-support analysis'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
