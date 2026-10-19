export const MAX_FILE_MB = 20;
export const MAX_FILES = 10;
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Validates the new-case form. Returns an error message, or null when it can be submitted. */
export function validateCaseForm(input: { caseText: string; ageGroup: string; sex: string; acuity: string }): string | null {
  if (input.caseText.trim().length < 10) return 'Please provide a clinical narrative of at least 10 characters.';
  if (!input.ageGroup || !input.sex || !input.acuity) {
    return 'Select age group, sex and acuity. Choose "Not specified" if unknown; nothing is assumed.';
  }
  return null;
}
