import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { NormalizedMriFindings } from '../mri/mri-findings';
import { MRI_INSTRUCTIONS, OUTPUT_SCHEMA, PROMPT_VERSION, SYSTEM_PROMPT } from './templates/clinical-v1.5.0';

export interface PromptPackage {
  systemPrompt: string;
  userPrompt: string;
  version: string;
  /** SHA-256 of the prompt template (not of patient data), recorded for provenance. */
  templateHash: string;
  /** Non-blocking safety observations about the input, surfaced to the clinician. */
  inputFlags: string[];
}

export interface MriFindingForPrompt {
  filename: string;
  findings: NormalizedMriFindings;
}

const CASE_START = '<<<CLINICAL_CASE_TEXT>>>';
const CASE_END = '<<<END_CLINICAL_CASE_TEXT>>>';

const INJECTION_PATTERN =
  /(ignore (all |any )?(the )?(previous|prior|above) (instructions|prompts?)|disregard (the )?(prior|previous|above) (prompt|instructions)|you are now (a|an) |system override|forget (all )?(your )?instructions|new instructions:|respond only with)/i;

export const TEMPLATE_HASH = createHash('sha256')
  .update([PROMPT_VERSION, SYSTEM_PROMPT, MRI_INSTRUCTIONS, OUTPUT_SCHEMA, CASE_START, CASE_END].join('\u0000'))
  .digest('hex');

/**
 * Neutralises sequences that could close or forge prompt delimiters. Angle-bracket runs are
 * replaced by look-alike guillemets so the clinical meaning of the text is preserved.
 */
export function escapeDelimiters(text: string): string {
  return text.replace(/<{3,}/g, (m) => '‹'.repeat(m.length)).replace(/>{3,}/g, (m) => '›'.repeat(m.length));
}

@Injectable()
export class PromptsService {
  get currentVersion(): string {
    return PROMPT_VERSION;
  }

  get templateHash(): string {
    return TEMPLATE_HASH;
  }

  buildClinicalPrompt(
    caseText: string,
    patientContext?: Record<string, unknown> | null,
    mriFindings: MriFindingForPrompt[] = [],
  ): PromptPackage {
    const trimmed = caseText.trim();
    if (!trimmed) {
      throw new BadRequestException('Clinical case text cannot be empty');
    }

    const inputFlags: string[] = [];
    if (INJECTION_PATTERN.test(trimmed)) {
      inputFlags.push('possible_prompt_injection');
    }

    let contextBlock = '';
    if (patientContext && Object.keys(patientContext).length > 0) {
      contextBlock = `STRUCTURED PATIENT CONTEXT (clinician-entered data):\n${escapeDelimiters(JSON.stringify(patientContext, null, 2))}\n\n`;
    }

    let mriBlock = '';
    const usable = mriFindings.filter((m) => m.findings.segmentedPixels !== null);
    if (usable.length > 0) {
      const byImage: Record<string, unknown> = {};
      usable.forEach((item, index) => {
        // Filenames are user-controlled; use a neutral label instead of inserting them.
        byImage[`image_${index + 1}`] = {
          segmented_pixels: item.findings.segmentedPixels,
          foreground_pixels: item.findings.foregroundPixels,
          area_percent: item.findings.areaPercent,
          sqrt_area_percent: item.findings.sqrtAreaPercent,
        };
      });
      mriBlock = `\nIMAGE-DERIVED MEASUREMENTS (automated model output, not clinician-observed):\n${JSON.stringify(byImage, null, 2)}\n${MRI_INSTRUCTIONS}`;
    }

    const userPrompt = `CLINICAL EVALUATION REQUEST:

${contextBlock}CLINICAL CASE:
${CASE_START}
${escapeDelimiters(trimmed)}
${CASE_END}
${mriBlock}
${OUTPUT_SCHEMA}`;

    return { systemPrompt: SYSTEM_PROMPT, userPrompt, version: PROMPT_VERSION, templateHash: TEMPLATE_HASH, inputFlags };
  }
}
