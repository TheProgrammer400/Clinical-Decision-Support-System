import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/config.service';
import {
  MriInferenceError,
  MriInferenceProvider,
  MultiImageInferenceResponse,
  UploadFileParam,
  multiImageResponseSchema,
} from '../interfaces/mri-inference-provider.interface';

@Injectable()
export class HttpMriInferenceClient implements MriInferenceProvider {
  private readonly logger = new Logger(HttpMriInferenceClient.name);

  constructor(private readonly config: AppConfigService) {}

  async analyzeImages(files: UploadFileParam[]): Promise<MultiImageInferenceResponse> {
    const targetUrl = `${this.config.mriInferenceServiceUrl}/predict`;
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.filename);
    }

    const headers: Record<string, string> = {};
    if (this.config.mriInferenceToken) {
      headers['X-Inference-Token'] = this.config.mriInferenceToken;
    }

    let response: Response;
    try {
      response = await fetch(targetUrl, {
        method: 'POST',
        body: formData,
        headers,
        signal: AbortSignal.timeout(this.config.mriInferenceTimeoutMs),
      });
    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      this.logger.error(`MRI inference request failed: ${message}`);
      throw new MriInferenceError(message);
    }

    if (!response.ok) {
      const body = (await response.text().catch(() => '')).slice(0, 500);
      this.logger.error(`MRI inference returned HTTP ${response.status}: ${body}`);
      throw new MriInferenceError(`HTTP ${response.status}`);
    }

    const parsed = multiImageResponseSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) {
      this.logger.error(`MRI inference response failed validation: ${parsed.error.issues[0]?.message}`);
      throw new MriInferenceError('Malformed inference response');
    }
    return parsed.data;
  }
}
