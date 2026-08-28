'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Sparkles, AlertCircle, FileText, UserCheck, Stethoscope, Image as ImageIcon, Upload, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function NewCasePage() {
  const router = useRouter();
  const [caseText, setCaseText] = useState('');
  const [ageGroup, setAgeGroup] = useState('51-65');
  const [sex, setSex] = useState('Male');
  const [mriFiles, setMriFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamingStep, setStreamingStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles: File[] = [];

      for (const file of selectedFiles) {
        if (file.size > 20 * 1024 * 1024) {
          setError(`File '${file.name}' exceeds 20MB maximum limit.`);
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
      const patientContext = { ageGroup, sex };

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

      // 4. Redirect to Case Detail Dashboard
      router.push(`/cases/${newCase.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to complete clinical evaluation request. Please retry.');
      setLoading(false);
      setStreamingStep(null);
    }
  };

  const handleSampleCase = () => {
    setCaseText(
      '62-year-old male with a history of hypertension and hyperlipidemia presents to the Emergency Department with sudden onset substernal chest pressure radiating to the left jaw and back, beginning 2 hours ago while at rest. Associated with diaphoresis, mild nausea, and shortness of breath. Vital signs: BP 155/92 mmHg, HR 102 bpm, SpO2 95% on room air, RR 22/min. No fever. EKG shows subtle ST depressions in leads V3-V5. Troponin T lab pending.',
    );
    setAgeGroup('51-65');
    setSex('Male');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <Stethoscope className="h-7 w-7 text-sky-400" />
            <span>New Clinical Case Evaluation</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Submit a clinical narrative and optional Brain MRI scans for AI decision support & U-Net segmentation.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSampleCase}
          className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Load Sample Case</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start space-x-3 text-red-400 text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Context Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
            <UserCheck className="h-4 w-4 text-sky-400" />
            <span>Optional Structured Patient Context (De-Identified)</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Age Group</label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-sm focus:border-sky-500 focus:outline-none"
              >
                <option value="0-17">Pediatric (0-17 yrs)</option>
                <option value="18-35">Adult (18-35 yrs)</option>
                <option value="36-50">Middle Adult (36-50 yrs)</option>
                <option value="51-65">Mature Adult (51-65 yrs)</option>
                <option value="65+">Geriatric (65+ yrs)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Biological Sex</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-sm focus:border-sky-500 focus:outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Unspecified">Unspecified / Intersex</option>
              </select>
            </div>
          </div>
        </div>

        {/* Brain MRI File Upload Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <ImageIcon className="h-4 w-4 text-purple-400" />
              <span>Attach Brain MRI Scans (Optional U-Net Segmentation)</span>
            </h2>
            <span className="text-xs text-slate-500">GPU PyTorch U-Net Model</span>
          </div>

          <div className="border-2 border-dashed border-slate-800 rounded-xl p-6 text-center hover:border-purple-500/40 transition-colors">
            <input
              type="file"
              id="mri-upload"
              multiple
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="mri-upload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <div className="p-3 bg-purple-500/10 rounded-full text-purple-400 border border-purple-500/20">
                <Upload className="h-6 w-6" />
              </div>
              <div className="text-sm font-medium text-slate-200">
                Click to attach brain MRI scan images (PNG, JPG, WEBP)
              </div>
              <div className="text-xs text-slate-500">
                Max 20MB per image. Quantitative tumor segmentation executed on GPU.
              </div>
            </label>
          </div>

          {/* Uploaded File Badges */}
          {mriFiles.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Attached MRI Scans ({mriFiles.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {mriFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900 border border-purple-500/30 rounded-xl text-xs text-purple-300 font-mono"
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-purple-400" />
                    <span>{file.name}</span>
                    <span className="text-slate-500 text-[10px]">
                      ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Clinical Narrative Input */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <FileText className="h-4 w-4 text-sky-400" />
              <span>Clinical Case Presentation Narrative</span>
            </label>
            <span className="text-xs text-slate-500">{caseText.length} characters</span>
          </div>

          <textarea
            required
            rows={8}
            value={caseText}
            onChange={(e) => setCaseText(e.target.value)}
            placeholder="Type clinical presentation details, chief complaint, symptom onset, history of present illness (HPI), vital signs, physical exam observations, lab/imaging results..."
            className="w-full p-4 bg-slate-900/90 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors leading-relaxed"
          />
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-3 px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow-lg shadow-sky-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Activity className="h-5 w-5 animate-spin text-white" />
                <span>Evaluating Case...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                <span>Run Differential Diagnosis Support</span>
              </>
            )}
          </button>
        </div>

        {/* Streaming Status Indicator */}
        {loading && streamingStep && (
          <div className="p-4 bg-slate-900 border border-sky-500/30 rounded-xl flex items-center space-x-3 animate-pulse">
            <Activity className="h-5 w-5 text-sky-400 animate-spin" />
            <div className="text-sm text-sky-300 font-medium">{streamingStep}</div>
          </div>
        )}
      </form>
    </div>
  );
}
