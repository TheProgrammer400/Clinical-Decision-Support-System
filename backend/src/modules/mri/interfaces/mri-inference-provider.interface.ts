import { z } from 'zod';

const findingsSchema = z
  .object({
    segmented_pixels: z.number().int().nonnegative().optional(),
    foreground_pixels: z.number().int().nonnegative().optional(),
    tumor_pixels: z.number().int().nonnegative().optional(),
    brain_pixels: z.number().int().nonnegative().optional(),
    area_percent: z.number().min(0).max(100),
    sqrt_area_percent: z.number().min(0).max(100).optional(),
    visual_width_span_percent: z.number().min(0).max(100).optional(),
    analysis_resolution: z.number().int().positive().optional(),
  })
  .passthrough();

export const singleImageResultSchema = z.object({
  image_name: z.string(),
  status: z.enum(['completed', 'failed']),
  findings: findingsSchema.nullish(),
  visualizations: z.object({ segmented_mask: z.string(), tumor_overlay: z.string() }).nullish(),
  model_version: z.string(),
  processing_time_ms: z.number().int().nonnegative(),
  error_message: z.string().nullish(),
});

export const multiImageResponseSchema = z.object({
  data: z.array(singleImageResultSchema),
  total_images: z.number().int().nonnegative(),
  model_version: z.string(),
});

export type SingleImageInferenceResult = z.infer<typeof singleImageResultSchema>;
export type MultiImageInferenceResponse = z.infer<typeof multiImageResponseSchema>;

export interface UploadFileParam {
  /** Server-generated, unique per request; used to match results to records. */
  filename: string;
  buffer: Buffer;
  mimetype: string;
}

export const MRI_INFERENCE_PROVIDER = 'MriInferenceProvider';

export class MriInferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MriInferenceError';
  }
}

export interface MriInferenceProvider {
  analyzeImages(files: UploadFileParam[]): Promise<MultiImageInferenceResponse>;
}
