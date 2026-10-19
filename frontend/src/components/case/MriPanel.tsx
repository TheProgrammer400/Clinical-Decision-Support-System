'use client';

import React, { useEffect, useState } from 'react';
import { Brain, ImageOff, Layers } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatNumber, formatPercent } from '@/lib/format';
import type { MriAnalysis } from '@/lib/types';

/** Image-derived measurements. Missing values are shown as unavailable; zero stays zero. */
export function MriPanel({ caseId, analyses }: { caseId: string; analyses: MriAnalysis[] }) {
  if (analyses.length === 0) return null;
  return (
    <section className="w-full bg-surface-container border border-outline-variant rounded-xl overflow-hidden" aria-label="MRI segmentation">
      <div className="border-b border-outline-variant p-4 bg-surface-container-low flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <h3 className="text-base font-bold flex items-center gap-2 text-on-surface">
          <Brain className="h-5 w-5 text-primary" aria-hidden="true" />
          Automated Image Segmentation
        </h3>
        <p className="text-[11px] text-on-surface-variant max-w-xl">
          Pixel counts at the model&apos;s analysis resolution, from an unvalidated 2D segmentation model. Not physical sizes; not a
          radiological interpretation.
        </p>
      </div>
      <div className="p-6 space-y-8">
        {analyses.map((mri) => (
          <MriItem key={mri.id} caseId={caseId} mri={mri} />
        ))}
      </div>
    </section>
  );
}

function MriItem({ caseId, mri }: { caseId: string; mri: MriAnalysis }) {
  const f = mri.findings;
  return (
    <article className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-variant font-mono">
        <span>File: {mri.originalFilename}</span>
        <span className="flex items-center gap-2">
          <span>Model {mri.modelVersion}</span>
          <span
            className={`px-2 py-0.5 rounded font-bold uppercase border ${
              mri.status === 'COMPLETED'
                ? 'bg-tertiary/10 text-tertiary border-tertiary/30'
                : mri.status === 'FAILED'
                  ? 'bg-error-container/40 text-error border-error/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            {mri.status}
          </span>
        </span>
      </div>

      {mri.status === 'FAILED' && (
        <p role="alert" className="text-xs text-error bg-error-container/30 border border-error/30 rounded p-3">
          Segmentation failed: {mri.errorMessage ?? 'no details available'}. No measurements were produced for this image.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
        <ArtifactImage caseId={caseId} mriId={mri.id} kind="original" available={mri.artifacts.original} label="Original" />
        <ArtifactImage caseId={caseId} mriId={mri.id} kind="mask" available={mri.artifacts.mask} label="Segmentation mask" />
        <ArtifactImage caseId={caseId} mriId={mri.id} kind="overlay" available={mri.artifacts.overlay} label="Overlay" />
      </div>

      {mri.status === 'COMPLETED' && (
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <Metric label="Segmented pixels" value={formatNumber(f?.segmentedPixels)} />
          <Metric label="Foreground pixels" value={formatNumber(f?.foregroundPixels)} />
          <Metric label="Segmented area (% of foreground)" value={formatPercent(f?.areaPercent)} highlight />
          <Metric label="√ area fraction (size index, not a width)" value={formatPercent(f?.sqrtAreaPercent)} />
        </dl>
      )}
    </article>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-surface-container-low border border-outline-variant rounded p-3.5 flex flex-col justify-between">
      <dt className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold mb-2">{label}</dt>
      <dd className={`font-mono text-lg ${highlight ? 'text-primary font-bold' : 'text-on-surface font-medium'}`}>{value}</dd>
    </div>
  );
}

/** Loads a protected image with the Authorization header and shows it through an object URL. */
export function ArtifactImage({
  caseId,
  mriId,
  kind,
  available,
  label,
}: {
  caseId: string;
  mriId: string;
  kind: 'original' | 'mask' | 'overlay';
  available: boolean;
  label: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!available) return;
    let url: string | null = null;
    let cancelled = false;
    apiClient
      .getArtifactObjectUrl(caseId, mriId, kind)
      .then((u) => {
        if (cancelled) URL.revokeObjectURL(u);
        else {
          url = u;
          setSrc(u);
        }
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [caseId, mriId, kind, available]);

  return (
    <figure className="relative aspect-square bg-surface-container-low flex flex-col items-center justify-center">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- object URL of an authenticated download
        <img src={src} alt={`${label} image`} className="w-full h-full object-contain" />
      ) : (
        <div className="text-center p-4 text-xs text-on-surface-variant font-mono">
          {error ? <ImageOff className="h-8 w-8 mx-auto mb-2" aria-hidden="true" /> : <Layers className="h-8 w-8 mx-auto mb-2 opacity-40" aria-hidden="true" />}
          {!available ? 'Not available' : error ? 'Could not load image' : 'Loading…'}
        </div>
      )}
      <figcaption className="absolute bottom-2 left-2 text-[10px] font-mono text-white/80 bg-black/60 px-1.5 py-0.5 rounded">{label}</figcaption>
    </figure>
  );
}
