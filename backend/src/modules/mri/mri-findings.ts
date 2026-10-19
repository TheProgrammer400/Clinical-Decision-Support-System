/**
 * MRI measurements as computed by the inference service.
 *
 * Older records (inference service <= unet_v1.2.0 API) used misleading names:
 *   tumor_pixels              -> segmented_pixels
 *   brain_pixels              -> foreground_pixels (pixels above an intensity threshold)
 *   visual_width_span_percent -> sqrt_area_percent (sqrt of the area fraction; not a width)
 * Both shapes are accepted. A missing value is null, never a substitute number, and a
 * genuine zero stays zero.
 */
export interface NormalizedMriFindings {
  segmentedPixels: number | null;
  foregroundPixels: number | null;
  areaPercent: number | null;
  sqrtAreaPercent: number | null;
  analysisResolution: number | null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function normalizeMriFindings(raw: unknown): NormalizedMriFindings | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const f = raw as Record<string, unknown>;
  return {
    segmentedPixels: num(f.segmented_pixels ?? f.tumor_pixels),
    foregroundPixels: num(f.foreground_pixels ?? f.brain_pixels),
    areaPercent: num(f.area_percent),
    sqrtAreaPercent: num(f.sqrt_area_percent ?? f.visual_width_span_percent),
    analysisResolution: num(f.analysis_resolution),
  };
}
