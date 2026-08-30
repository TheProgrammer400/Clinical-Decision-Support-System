'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Sparkles,
  AlertCircle,
  FileText,
  User,
  Stethoscope,
  Upload,
  X,
  Download,
  Rocket,
  MemoryStick,
  Tag,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import DoctorSidebar from '@/components/DoctorSidebar';

export default function NewCasePage() {
  const router = useRouter();
  const [caseText, setCaseText] = useState('');
  const [ageGroup, setAgeGroup] = useState('adult');
  const [sex, setSex] = useState('m');
  const [acuity, setAcuity] = useState('acute');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['Hypertension', 'Hyperlipidemia']);
  const [mriFiles, setMriFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamingStep, setStreamingStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/^,|,$/g, '');
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles: File[] = [];

      for (const file of selectedFiles) {
        if (file.size > 50 * 1024 * 1024) {
          setError(`File '${file.name}' exceeds 50MB maximum limit.`);
          return;
        }
        if (!file.type.startsWith('image/')) {
          setError(`File '${file.name}' is not a valid image format.`);
          return;
        }
        validFiles.push(file);
      }

      setError(null);
      setMriFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setMriFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseText.trim() || caseText.trim().length < 10) {
      setError('Please provide a detailed clinical case narrative (at least 10 characters).');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const idempotencyKey = `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const patientContext = {
        ageGroup,
        sex,
        acuity,
        historyTags: tags,
      };

      // 1. Create Case Entry
      setStreamingStep('Creating clinical case record...');
      const newCase = await apiClient.createCase(caseText, patientContext, idempotencyKey);

      // 2. Upload and Run U-Net Segmentation if MRI images attached
      if (mriFiles.length > 0) {
        setStreamingStep(`Running U-Net brain MRI segmentation on GPU (${mriFiles.length} file${mriFiles.length > 1 ? 's' : ''})...`);
        try {
          await apiClient.uploadMri(newCase.id, mriFiles);
        } catch (mriErr: any) {
          console.error('MRI Segmentation warning:', mriErr);
          setError(`MRI segmentation warning: ${mriErr.message || 'Image processing failed'}. Proceeding with text analysis.`);
        }
      }

      // 3. Trigger Groq LLM Clinical Reasoning Engine
      setStreamingStep('Invoking Groq LLM clinical reasoning engine...');
      await apiClient.analyzeCase(newCase.id);

      setStreamingStep('Finalizing schema validation and safety checks...');

      // 4. Redirect to Case Detail Record Page
      router.push(`/cases/${newCase.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to complete clinical evaluation request. Please retry.');
      setLoading(false);
      setStreamingStep(null);
    }
  };

  const handleSampleCase = () => {
    setCaseText(
      'Patient is a 54yo M presenting with sudden onset left-sided weakness and aphasia beginning approximately 2 hours prior to arrival. History of progressive morning headache over 3 weeks. Non-contrast CT showed suspicious hypodense area in right frontal lobe with partial ventricle effacement. Patient has history of melanoma resected 5 years ago. Sent for T1/T2/FLAIR MRI with gadolinium contrast to evaluate for primary malignancy vs metastasis.',
    );
    setAgeGroup('adult');
    setSex('m');
    setAcuity('acute');
    setTags(['Hypertension', 'Hyperlipidemia', 'Prior Melanoma']);
  };

  return (
    <div className="flex min-h-screen bg-background text-on-surface font-body antialiased selection:bg-primary selection:text-on-primary">
      <DoctorSidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
      {/* Top App Bar Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-outline-variant bg-surface shrink-0">
        <div>
          <h2 className="text-xl font-headline font-bold text-on-surface tracking-tight">
            New Clinical Case Evaluation
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Input patient parameters and narrative for differential generation.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSampleCase}
          className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded text-sm font-medium text-on-surface hover:bg-surface-variant transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        >
          <Download className="h-4 w-4 text-primary" />
          <span>Load Sample Case</span>
        </button>
      </header>

      {/* Form Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {error && (
            <div className="p-4 bg-error-container/40 border border-error/30 rounded-lg flex items-start gap-3 text-on-error-container text-sm">
              <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form id="clinical-case-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Structured Patient Context */}
            <section className="bg-surface-container rounded-lg border border-outline-variant p-6 space-y-6">
              <h3 className="text-base font-semibold text-on-surface flex items-center gap-2 tracking-tight">
                <User className="h-4 w-4 text-primary" />
                <span>Structured Patient Context</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-on-surface-variant">Age Group</label>
                  <select
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-colors appearance-none"
                  >
                    <option value="pediatric">Pediatric (0-17)</option>
                    <option value="adult">Adult (18-64)</option>
                    <option value="geriatric">Geriatric (65+)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-on-surface-variant">Biological Sex</label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-colors appearance-none"
                  >
                    <option value="m">Male</option>
                    <option value="f">Female</option>
                    <option value="other">Other/Undetermined</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-on-surface-variant">Onset Acuity</label>
                  <select
                    value={acuity}
                    onChange={(e) => setAcuity(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-colors appearance-none"
                  >
                    <option value="hyperacute">Hyperacute (&lt; 24h)</option>
                    <option value="acute">Acute (1-7 days)</option>
                    <option value="subacute">Subacute (1-4 weeks)</option>
                    <option value="chronic">Chronic (&gt; 4 weeks)</option>
                  </select>
                </div>
              </div>

              {/* History Tags Input */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-on-surface-variant">
                  Clinical History Tags (Press Enter or comma to add)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="e.g., Hypertension, Type 2 Diabetes, Smoker..."
                    className="w-full bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-outline"
                  />
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-variant border border-outline-variant text-xs text-on-surface font-mono"
                      >
                        <Tag className="h-3 w-3 text-primary" />
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(t)}
                          className="hover:text-error transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Section 2: Radiology Data Pipeline (Optional) */}
            <section className="bg-surface-container rounded-lg border border-outline-variant p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-on-surface flex items-center gap-2 tracking-tight">
                  <MemoryStick className="h-4 w-4 text-primary" />
                  <span>Radiology Data Pipeline</span>
                  <span className="text-xs font-normal text-on-surface-variant ml-1">(Optional)</span>
                </h3>
                <span className="text-[10px] uppercase tracking-widest text-tertiary bg-tertiary-container/20 px-2 py-1 rounded font-medium border border-tertiary/20">
                  GPU PyTorch U-Net
                </span>
              </div>

              <div className="border-2 border-dashed border-outline-variant hover:border-primary/50 transition-colors rounded-lg bg-surface-container-lowest p-8 flex flex-col items-center justify-center text-center cursor-pointer group relative">
                <input
                  type="file"
                  id="mri-file-upload"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="w-12 h-12 rounded-full bg-surface-variant border border-outline-variant flex items-center justify-center mb-3 group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors">
                  <Upload className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-sm font-medium text-on-surface mb-1">Upload Brain MRI Scans</p>
                <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
                  Drag and drop PNG, JPG files here, or click to browse. Max 50MB per scan study.
                </p>
              </div>

              {/* Uploaded Files Chips */}
              {mriFiles.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    Attached MRI Studies ({mriFiles.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {mriFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-container-low border border-primary/30 rounded text-xs text-primary font-mono"
                      >
                        <MemoryStick className="h-3.5 w-3.5" />
                        <span>{file.name}</span>
                        <span className="text-on-surface-variant text-[10px]">
                          ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="hover:text-error transition-colors ml-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Section 3: Clinical Case Narrative */}
            <section className="bg-surface-container rounded-lg border border-outline-variant p-6 space-y-4">
              <h3 className="text-base font-semibold text-on-surface flex items-center gap-2 tracking-tight">
                <FileText className="h-4 w-4 text-primary" />
                <span>Clinical Case Narrative</span>
              </h3>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-on-surface-variant">
                  History of Present Illness (HPI) &amp; Symptoms
                </label>
                <div className="relative">
                  <textarea
                    required
                    rows={8}
                    value={caseText}
                    onChange={(e) => setCaseText(e.target.value)}
                    placeholder="Patient is a 54yo M presenting with sudden onset left-sided weakness and aphasia beginning approximately 2 hours prior to arrival..."
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-sm font-mono text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-y leading-relaxed placeholder:text-outline/50"
                  />
                  <div className="absolute bottom-3 right-3 text-[10px] text-on-surface-variant font-mono">
                    Markdown supported
                  </div>
                </div>
              </div>
            </section>
          </form>

          {/* Streaming Status Step Indicator */}
          {loading && streamingStep && (
            <div className="p-4 bg-surface-container border border-primary/30 rounded-lg flex items-center gap-3 animate-pulse">
              <Activity className="h-5 w-5 text-primary animate-spin" />
              <span className="text-sm text-primary font-medium">{streamingStep}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Action */}
      <footer className="p-6 border-t border-outline-variant bg-surface shrink-0">
        <div className="max-w-5xl mx-auto flex justify-end">
          <button
            type="submit"
            form="clinical-case-form"
            disabled={loading}
            className="flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-6 py-3 rounded-md text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Activity className="h-4 w-4 animate-spin" />
                <span>Processing Case Evaluation...</span>
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                <span>Execute Differential Analysis</span>
              </>
            )}
          </button>
        </div>
      </footer>
      </div>
    </div>
  );
}
