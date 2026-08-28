export interface MriFindingsResult {
  tumor_pixels: number;
  brain_pixels: number;
  area_percent: number;
  visual_width_span_percent: number;
}

export interface VisualizationsResult {
  segmented_mask: string; // base64 string
  tumor_overlay: string;  // base64 string
}

export interface SingleImageInferenceResult {
  image_name: string;
  status: 'completed' | 'failed';
  findings?: MriFindingsResult;
  visualizations?: VisualizationsResult;
  model_version: string;
  processing_time_ms: number;
  error_message?: string;
}

export interface MultiImageInferenceResponse {
  data: SingleImageInferenceResult[];
  total_images: number;
  model_version: string;
}

export interface UploadFileParam {
  filename: string;
  buffer: Buffer;
  mimetype: string;
}

export interface MriInferenceProvider {
  analyzeImages(files: UploadFileParam[]): Promise<MultiImageInferenceResponse>;
}
