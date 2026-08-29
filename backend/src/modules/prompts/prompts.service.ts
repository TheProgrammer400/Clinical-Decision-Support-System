import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';

export interface PromptPackage {
  systemPrompt: string;
  userPrompt: string;
  version: string;
}

export interface MriFindingForPrompt {
  filename: string;
  findings: {
    tumor_pixels: number;
    brain_pixels: number;
    area_percent: number;
    visual_width_span_percent: number;
  };
}

@Injectable()
export class PromptsService {
  private readonly logger = new Logger(PromptsService.name);

  constructor(private readonly configService: AppConfigService) {}

  get currentVersion(): string {
    return this.configService.promptVersion || 'v1.4.0';
  }

  /**
   * Screens case text for high-risk prompt injection override attempts.
   */
  private sanitizeAndCheckCaseText(rawCaseText: string): string {
    const trimmed = rawCaseText.trim();
    if (!trimmed) {
      throw new BadRequestException('Clinical case text cannot be empty');
    }

    const injectionPattern = /(ignore (all )?previous instructions|disregard prior prompt|you are now a|system override|forget all instructions)/i;
    if (injectionPattern.test(trimmed)) {
      this.logger.warn(`Potential prompt injection phrase detected in case submission.`);
    }

    return trimmed;
  }

  /**
   * Constructs the versioned prompt package.
   */
  buildClinicalPrompt(
    caseText: string,
    patientContext?: Record<string, any>,
    mriFindings?: MriFindingForPrompt[],
  ): PromptPackage {
    const cleanCaseText = this.sanitizeAndCheckCaseText(caseText);

    const systemPrompt = `SYSTEM ROLE: You are an expert Clinical Decision Support System (CDSS) assistant aiding licensed physicians.
Your objective is to provide evidence-informed, probabilistic differential diagnostic considerations, identify urgent red flag presentations, list missing clinical information needed, and suggest diagnostic investigations.

CRITICAL CLINICAL & SAFETY CONSTRAINTS:
1. DO NOT make definitive or authoritative medical diagnoses. You provide decision support ONLY.
2. DO NOT prescribe precise drug dosages or treatment regimens.
3. Express diagnostic likelihood QUALITATIVELY only using exact values: "high", "moderate", or "low". NEVER use numeric percentages.
4. Dynamically assess clinical alert severity based strictly on case urgency:
   - "critical": ONLY for acute, life-threatening, or time-sensitive emergency conditions requiring immediate rule-out (e.g. ACS, aortic dissection, tension pneumothorax, brain herniation, acute mass effect).
   - "moderate": For clinically important concerns requiring timely evaluation, but NOT an immediate life-threatening emergency (e.g. subacute symptoms, persistent mass needing workup).
   - "low": When NO immediate red flags or time-sensitive emergency concerns are present (e.g. chronic joint pain, mild tension headache). DO NOT default routine cases to critical/emergency status.
5. Identify key missing history, physical exam findings, or lab values.
6. Explicitly state supporting and contradicting evidence for each differential consideration, incorporating quantitative image-derived U-Net findings whenever provided.
7. Return your entire analysis as a valid, single JSON object adhering strictly to the requested schema.`;

    let contextFormatted = '';
    if (patientContext && Object.keys(patientContext).length > 0) {
      contextFormatted = `STRUCTURED PATIENT CONTEXT:\n${JSON.stringify(patientContext, null, 2)}\n\n`;
    }

    let mriFormatted = '';
    let mriInstructions = '';

    if (mriFindings && mriFindings.length > 0) {
      const structuredUnetJson: Record<string, any> = {};
      mriFindings.forEach((item) => {
        structuredUnetJson[item.filename] = {
          tumor_pixels: item.findings.tumor_pixels,
          brain_pixels: item.findings.brain_pixels,
          area_percent: item.findings.area_percent,
          visual_width_span_percent: item.findings.visual_width_span_percent,
        };
      });

      mriFormatted = `
IMAGE-DERIVED U-NET FINDINGS:
\`\`\`json
${JSON.stringify(structuredUnetJson, null, 2)}
\`\`\`
`;

      mriInstructions = `
U-NET INTEGRATION INSTRUCTIONS:
- Analyze the clinical case narrative and U-Net findings together.
- EXPLICITLY reference and weave the quantitative U-Net metrics (such as tumor area percentage, visual width span percentage, and pixel counts) into your 'clinical_reasoning', 'case_summary', 'supporting_evidence', and 'uncertainty_notes' as supporting image-derived evidence.
- DO NOT invent qualitative MRI characteristics (such as T1/T2 signal intensity, contrast ring enhancement, or edema patterns) that were not explicitly mentioned in the clinical text or U-Net data.
- DO NOT infer tumor type, histology, or tumor grade solely from U-Net segmentation measurements.
- Treat U-Net measurements strictly as supporting quantitative evidence regarding the presence and spatial extent of a segmented abnormal region.
- Distinguish automated model-derived findings from clinician-observed symptoms and physical exam signs.
- If available clinical and imaging information is insufficient for a definitive etiology, explicitly state that in 'uncertainty_notes'.
`;
    }

    const userPrompt = `CLINICAL EVALUATION REQUEST:

${contextFormatted}CLINICAL CASE:
<<<CLINICAL_CASE_TEXT>>>
${cleanCaseText}
<<<END_CLINICAL_CASE_TEXT>>>
${mriFormatted}${mriInstructions}
OUTPUT REQUIREMENTS:
You MUST respond strictly with a valid JSON object matching the following structure:
{
  "case_summary": "Concise 2-3 sentence summary of the presenting case, incorporating U-Net image findings if present",
  "key_clinical_findings": ["List of significant clinical symptoms/signs and image-derived quantitative findings identified"],
  "missing_information": ["List of missing history, exams, or labs required for definitive assessment"],
  "differential_diagnoses": [
    {
      "diagnosis": "Diagnostic consideration name",
      "likelihood": "high | moderate | low",
      "supporting_evidence": ["Key factors supporting this consideration, citing U-Net metrics where relevant"],
      "contradicting_evidence": ["Factors pointing away or absent markers"]
    }
  ],
  "alert": {
    "severity": "critical | moderate | low",
    "title": "Header text corresponding to severity (e.g., CRITICAL — URGENT EMERGENCY RULE-OUTS, MODERATE — CLINICAL CONCERNS TO MONITOR, or LOW — NO IMMEDIATE RED FLAGS IDENTIFIED)",
    "summary": "Short 1-2 sentence overview of alert status",
    "items": ["List of specific clinical concerns, red flags, or monitoring items"]
  },
  "red_flags": ["List of specific urgent clinical concerns or red flags"],
  "recommended_investigations": ["Key diagnostic tests/imaging/labs to consider"],
  "clinical_reasoning": "Synthesis of diagnostic thought process, explicitly discussing U-Net quantitative findings and their clinical context",
  "uncertainty_notes": "Explicit statement of evaluation limitations based on input completeness and U-Net segmentation constraints",
  "disclaimer": "This is decision support only."
}

Generate the JSON analysis now:`;

    return {
      systemPrompt,
      userPrompt,
      version: this.currentVersion,
    };
  }
}
