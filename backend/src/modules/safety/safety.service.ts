import { Injectable, Logger } from '@nestjs/common';
import { ClinicalAnalysisResponse, ClinicalResponseSchema } from './dto/clinical-response.schema';

export const SERVER_FIXED_DISCLAIMER =
  'AI-GENERATED CLINICAL DECISION SUPPORT — NOT A DEFINITIVE DIAGNOSIS. THIS SYSTEM SUPPORTS BUT DOES NOT REPLACE INDEPENDENT CLINICAL JUDGMENT BY A LICENSED HEALTHCARE PROFESSIONAL.';

/** Safety observations persisted with an analysis and displayed to the clinician. */
export type SafetyFlag =
  | 'possible_prompt_injection'
  | 'dosage_content'
  | 'imaging_reference_without_imaging'
  | 'severity_inferred';

export const SAFETY_FLAG_DESCRIPTIONS: Record<SafetyFlag, string> = {
  possible_prompt_injection:
    'The case text contains phrasing that resembles an attempt to override the assistant instructions. Review the output with extra care.',
  dosage_content:
    'The output contains specific dosing or administration details, which this system is instructed not to provide. Verify independently; do not act on them.',
  imaging_reference_without_imaging:
    'The output refers to image segmentation results although no MRI measurements were supplied for this case.',
  severity_inferred:
    'The model did not return a valid alert severity; the displayed severity was derived from the listed red flags.',
};

export class OutputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OutputValidationError';
  }
}

export interface ValidatedAnalysis {
  data: ClinicalAnalysisResponse;
  flags: SafetyFlag[];
}

const DOSAGE_PATTERN = /\b\d+(\.\d+)?\s*(mg|g|mcg|µg|ug|ml|mL|units?|iu|IU|mg\/kg|mcg\/kg)\b(\s*(\/|per)\s*(day|kg|h|hr|dose))?(\s*(po|iv|im|sc|sq|q\d+h|bid|tid|qid|daily|prn|stat|od|bd))?/i;
const IMAGING_PATTERN = /\b(u-?net|segment(ed|ation)|segmented_pixels|area_percent|sqrt_area_percent|tumou?r_pixels|foreground_pixels)\b/i;

@Injectable()
export class SafetyService {
  private readonly logger = new Logger(SafetyService.name);

  /**
   * Parses and validates model output against the clinical schema, applies server-side
   * safety rules and returns explicit flags. Throws OutputValidationError for malformed or
   * incomplete output. It never fills in missing clinical content.
   */
  validateAndSanitize(rawJsonContent: string, context: { hasImaging: boolean } = { hasImaging: false }): ValidatedAnalysis {
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripCodeFence(rawJsonContent));
    } catch {
      throw new OutputValidationError('LLM output is not valid JSON');
    }

    const result = ClinicalResponseSchema.safeParse(parsed);
    if (!result.success) {
      const summary = result.error.issues
        .slice(0, 10)
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; ');
      throw new OutputValidationError(`LLM output failed schema validation: ${summary}`);
    }

    const data = result.data;
    const flags: SafetyFlag[] = [];
    const serialized = JSON.stringify(data);

    if (DOSAGE_PATTERN.test(serialized)) {
      flags.push('dosage_content');
      this.logger.warn('LLM output contains dosing details; flagged for the clinician.');
    }
    if (!context.hasImaging && IMAGING_PATTERN.test(serialized)) {
      flags.push('imaging_reference_without_imaging');
    }

    // The disclaimer is always server-controlled.
    data.disclaimer = SERVER_FIXED_DISCLAIMER;

    if (!data.alert) {
      // A missing alert is inferred from the model's own red flags and labelled as inferred.
      flags.push('severity_inferred');
      data.alert =
        data.red_flags.length > 0
          ? {
              severity: 'moderate',
              title: 'MODERATE — CLINICAL CONCERNS TO MONITOR',
              summary: 'Severity inferred from the red flags listed by the model.',
              items: [...data.red_flags],
            }
          : {
              severity: 'low',
              title: 'LOW — NO IMMEDIATE RED FLAGS LISTED',
              summary: 'The model listed no red flags. This is not a confirmation that none exist.',
              items: [],
            };
    } else {
      if (data.alert.items.length === 0 && data.red_flags.length > 0) {
        data.alert.items = [...data.red_flags];
      }
      if (data.red_flags.length === 0 && data.alert.items.length > 0) {
        data.red_flags = [...data.alert.items];
      }
    }

    return { data, flags };
  }
}

/** Some models wrap JSON in a markdown fence despite instructions. */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return match ? match[1] : trimmed;
}
