import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { ClinicalResponseSchema, ClinicalAnalysisResponse } from './dto/clinical-response.schema';

export const SERVER_FIXED_DISCLAIMER =
  'AI-GENERATED CLINICAL DECISION SUPPORT — NOT A DEFINITIVE DIAGNOSIS. THIS SYSTEM SUPPORTS BUT DOES NOT REPLACE INDEPENDENT CLINICAL JUDGMENT BY A LICENSED HEALTHCARE PROFESSIONAL.';

@Injectable()
export class SafetyService {
  private readonly logger = new Logger(SafetyService.name);

  /**
   * Validates raw JSON content against the clinical Zod schema,
   * performs safety checks, and injects the server-controlled fixed disclaimer.
   */
  validateAndSanitize(rawJsonContent: string): ClinicalAnalysisResponse {
    let parsed: any;
    try {
      parsed = JSON.parse(rawJsonContent);
    } catch (e) {
      this.logger.error(`JSON Parse Error: ${e.message}`);
      throw new UnprocessableEntityException('LLM output could not be parsed as valid JSON');
    }

    const validationResult = ClinicalResponseSchema.safeParse(parsed);
    if (!validationResult.success) {
      const issueSummary = validationResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      this.logger.warn(`Schema Validation Failed: ${issueSummary}`);
      throw new UnprocessableEntityException(`LLM output schema validation failed: ${issueSummary}`);
    }

    const validatedData = validationResult.data;

    // Safety Rule 1: Ensure mandatory safety fields exist (even if empty arrays/strings)
    if (!Array.isArray(validatedData.red_flags)) {
      validatedData.red_flags = [];
    }
    if (!Array.isArray(validatedData.missing_information)) {
      validatedData.missing_information = [];
    }
    if (!validatedData.uncertainty_notes) {
      validatedData.uncertainty_notes = 'Qualitative clinical decision support based on presented text.';
    }

    // Safety Rule 2: Unsafe drug dosage pattern check (log warnings if detailed prescribing patterns found)
    const unsafeDosageRegex = /\b\d+(\.\d+)?\s*(mg|g|mcg|ml|units)\s*(po|iv|im|q\d+h|bid|tid|qid|daily|prn)\b/i;
    const jsonString = JSON.stringify(validatedData);
    if (unsafeDosageRegex.test(jsonString)) {
      this.logger.warn('LLM output contains explicit drug dosage recommendations. Prescribing guidelines defer strictly to physician.');
    }

    // Safety Rule 3: Server ALWAYS overwrites the disclaimer field
    validatedData.disclaimer = SERVER_FIXED_DISCLAIMER;

    return validatedData;
  }
}
