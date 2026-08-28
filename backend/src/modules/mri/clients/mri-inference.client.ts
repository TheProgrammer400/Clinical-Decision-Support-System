import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { AppConfigService } from '../../config/config.service';
import {
  MriInferenceProvider,
  UploadFileParam,
  MultiImageInferenceResponse,
} from '../interfaces/mri-inference-provider.interface';

@Injectable()
export class HttpMriInferenceClient implements MriInferenceProvider {
  private readonly logger = new Logger(HttpMriInferenceClient.name);

  constructor(private readonly configService: AppConfigService) {}

  async analyzeImages(files: UploadFileParam[]): Promise<MultiImageInferenceResponse> {
    const serviceUrl = this.configService.mriInferenceServiceUrl || 'http://localhost:8000';
    const targetUrl = `${serviceUrl.replace(/\/$/, '')}/predict`;

    this.logger.log(`Invoking MRI Inference Service at ${targetUrl} for ${files.length} file(s)...`);

    try {
      // Build multipart/form-data payload natively using Blob / FormData in Node 18+
      const formData = new FormData();

      for (const file of files) {
        const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
        formData.append('files', blob, file.filename);
      }

      const response = await fetch(targetUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`MRI Inference Service returned HTTP ${response.status}: ${errorText}`);
        throw new ServiceUnavailableException(
          `MRI Inference Service request failed with HTTP status ${response.status}: ${errorText}`,
        );
      }

      const data: MultiImageInferenceResponse = await response.json();
      this.logger.log(
        `MRI Inference Service completed analysis. Processed ${data.total_images} image(s), model_version=${data.model_version}`,
      );

      return data;
    } catch (error) {
      this.logger.error(`Failed to execute MRI inference request: ${error.message}`, error.stack);
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException(
        `MRI Inference Service connection error: ${error.message}`,
      );
    }
  }
}
