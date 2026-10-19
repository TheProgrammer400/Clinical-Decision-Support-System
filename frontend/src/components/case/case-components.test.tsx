import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { analysis, FABRICATED, mri, result } from '@/test/fixtures';
import { AnalysisResultView } from './AnalysisResultView';
import { AnalysisStatusNotice } from './AnalysisStatusNotice';
import { MriPanel } from './MriPanel';
import { SafetyFlagsNotice } from './SafetyFlagsNotice';

vi.mock('@/lib/api-client', () => ({
  apiClient: { getArtifactObjectUrl: vi.fn().mockResolvedValue('blob:artifact') },
}));

describe('AnalysisStatusNotice', () => {
  it('announces a failed analysis as producing no result', () => {
    render(<AnalysisStatusNotice analysis={analysis({ status: 'GROQ_ERROR', errorCode: 'LLM_TIMEOUT', result: null })} caseStatus="FAILED" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/no result was produced/i);
    expect(alert).toHaveTextContent(/did not respond in time/i);
  });

  it('labels mock output as synthetic', () => {
    render(<AnalysisStatusNotice analysis={analysis({ isMock: true })} caseStatus="COMPLETED" />);
    expect(screen.getByRole('alert')).toHaveTextContent(/must not be used clinically/i);
  });

  it('explains when no analysis exists and when one is running', () => {
    const { rerender } = render(<AnalysisStatusNotice analysis={null} caseStatus="PENDING" />);
    expect(screen.getByText(/has not been analysed/i)).toBeInTheDocument();
    rerender(<AnalysisStatusNotice analysis={null} caseStatus="ANALYZING" />);
    expect(screen.getByText(/analysis in progress/i)).toBeInTheDocument();
  });

  it('shows nothing extra for a real successful analysis', () => {
    const { container } = render(<AnalysisStatusNotice analysis={analysis()} caseStatus="COMPLETED" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('AnalysisResultView', () => {
  it('renders only what the model returned', () => {
    render(<AnalysisResultView result={result()} />);
    expect(screen.getByText('Migraine without aura')).toBeInTheDocument();
    expect(screen.getByText('Model summary of this specific case.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/likelihood:\s*\d+%/i);
  });

  it('shows explicit empty states instead of invented content', () => {
    render(
      <AnalysisResultView
        result={result({ key_clinical_findings: [], missing_information: [], recommended_investigations: [], clinical_reasoning: '', uncertainty_notes: '' })}
      />,
    );
    expect(screen.getByText(/did not suggest investigations/i)).toBeInTheDocument();
    expect(screen.getByText(/did not list missing information/i)).toBeInTheDocument();
    expect(screen.getAllByText(/not provided by the model/i)).toHaveLength(2);
    for (const pattern of FABRICATED) expect(document.body.textContent).not.toMatch(pattern);
  });

  it('does not claim the absence of red flags when none were listed', () => {
    render(<AnalysisResultView result={result({ alert: { severity: 'low', items: [] }, red_flags: [] })} />);
    expect(screen.getByText(/not confirmation that none exist/i)).toBeInTheDocument();
  });

  it('reports a missing urgency assessment instead of defaulting to low', () => {
    render(<AnalysisResultView result={result({ alert: undefined })} />);
    expect(screen.getByText(/did not provide an urgency assessment/i)).toBeInTheDocument();
    expect(screen.queryByText(/severity: low/i)).not.toBeInTheDocument();
  });
});

describe('MriPanel', () => {
  it('displays genuine zero measurements as zero', async () => {
    render(<MriPanel caseId="c1" analyses={[mri()]} />);
    const metrics = screen.getAllByRole('definition').map((d) => d.textContent);
    expect(metrics).toEqual(['0', '900', '0%', '0%']);
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(3));
    for (const pattern of FABRICATED) expect(document.body.textContent).not.toMatch(pattern);
  });

  it('shows missing measurements as unavailable', () => {
    render(<MriPanel caseId="c1" analyses={[mri({ findings: { segmentedPixels: null, foregroundPixels: null, areaPercent: null, sqrtAreaPercent: null, analysisResolution: null } })]} />);
    expect(screen.getAllByText('Not available').length).toBeGreaterThanOrEqual(4);
  });

  it('explains failed segmentation and shows no measurements', () => {
    render(<MriPanel caseId="c1" analyses={[mri({ status: 'FAILED', errorMessage: 'Image is too small', findings: null, artifacts: { original: true, mask: false, overlay: false } })]} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Image is too small');
    expect(screen.queryAllByRole('definition')).toHaveLength(0);
  });
});

describe('SafetyFlagsNotice', () => {
  it('lists each flag with an explanation', () => {
    render(<SafetyFlagsNotice flags={['dosage_content', 'possible_prompt_injection']} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/dosing/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/override/i);
  });
});
