import { normalizeMriFindings } from './mri-findings';

describe('normalizeMriFindings', () => {
  it('keeps genuine zero measurements as zero', () => {
    expect(normalizeMriFindings({ segmented_pixels: 0, foreground_pixels: 900, area_percent: 0, sqrt_area_percent: 0 })).toEqual({
      segmentedPixels: 0,
      foregroundPixels: 900,
      areaPercent: 0,
      sqrtAreaPercent: 0,
      analysisResolution: null,
    });
  });

  it('maps legacy key names', () => {
    expect(normalizeMriFindings({ tumor_pixels: 405, brain_pixels: 7648, area_percent: 5.3, visual_width_span_percent: 23 })).toMatchObject({
      segmentedPixels: 405,
      foregroundPixels: 7648,
      areaPercent: 5.3,
      sqrtAreaPercent: 23,
    });
  });

  it('reports missing or non-numeric values as null rather than substituting numbers', () => {
    expect(normalizeMriFindings({ area_percent: 'n/a' })).toEqual({
      segmentedPixels: null,
      foregroundPixels: null,
      areaPercent: null,
      sqrtAreaPercent: null,
      analysisResolution: null,
    });
    expect(normalizeMriFindings(null)).toBeNull();
    expect(normalizeMriFindings([1, 2])).toBeNull();
  });
});
