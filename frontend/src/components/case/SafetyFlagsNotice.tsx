import React from 'react';
import { ShieldAlert } from 'lucide-react';
import type { SafetyFlag } from '@/lib/types';

export const SAFETY_FLAG_TEXT: Record<SafetyFlag, string> = {
  possible_prompt_injection:
    'The case text contains phrasing that resembles an attempt to override the assistant instructions. Review the output with extra care.',
  dosage_content:
    'The output contains specific dosing or administration details, which this system is instructed not to provide. Verify independently; do not act on them.',
  imaging_reference_without_imaging: 'The output refers to image segmentation results although no MRI measurements were supplied.',
  severity_inferred: 'The model did not return a valid alert severity; the severity shown was derived from the red flags it listed.',
};

export function SafetyFlagsNotice({ flags }: { flags: SafetyFlag[] }) {
  if (flags.length === 0) return null;
  return (
    <div role="alert" className="w-full rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 space-y-2">
      <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
        <ShieldAlert className="h-4 w-4" aria-hidden="true" />
        Safety checks flagged this output
      </h3>
      <ul className="list-disc pl-5 space-y-1 text-xs text-amber-100">
        {flags.map((f) => (
          <li key={f}>{SAFETY_FLAG_TEXT[f] ?? f}</li>
        ))}
      </ul>
    </div>
  );
}
