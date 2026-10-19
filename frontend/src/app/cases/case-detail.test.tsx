import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analysis, caseDetail, FABRICATED } from '@/test/fixtures';
import CaseDetailPage from './[id]/page';

const getCase = vi.fn();
let failNext = false;
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'c1' }),
  usePathname: () => '/cases/c1',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/lib/session', () => ({
  RequireAuth: ({ children }: { children: React.ReactNode }) => children,
  useSession: () => ({ user: { role: 'DOCTOR' }, signOut: vi.fn() }),
}));
vi.mock('@/lib/api-client', () => ({
  ApiError: class ApiError extends Error {},
  apiClient: {
    getCase: (...args: unknown[]) => (failNext ? Promise.reject(new Error('network down')) : getCase(...args)),
    getArtifactObjectUrl: vi.fn().mockResolvedValue('blob:x') },
}));

describe('Case detail page', () => {
  beforeEach(() => {
    getCase.mockReset();
    failNext = false;
  });

  it('never shows invented clinical content for a failed analysis (regression)', async () => {
    getCase.mockResolvedValue(
      caseDetail({ status: 'FAILED', analyses: [analysis({ status: 'VALIDATION_FAILED', errorCode: 'OUTPUT_INVALID', result: null })] }),
    );
    render(<CaseDetailPage />);
    expect(await screen.findByText(/no result was produced/i)).toBeInTheDocument();
    expect(screen.queryByText(/differential considerations/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/severity:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/was this output useful/i)).not.toBeInTheDocument();
    for (const pattern of FABRICATED) expect(document.body.textContent).not.toMatch(pattern);
  });

  it('renders a successful analysis with its provenance and the real doctor', async () => {
    getCase.mockResolvedValue(caseDetail());
    render(<CaseDetailPage />);
    expect(await screen.findByText('Migraine without aura')).toBeInTheDocument();
    expect(screen.getByText('Dr Real Name')).toBeInTheDocument();
    expect(screen.getByText(/model model-x · prompt v1\.5\.0/)).toBeInTheDocument();
    expect(screen.getByText(/was this output useful/i)).toBeInTheDocument();
  });

  it('shows a not-yet-analysed state when there are no analyses', async () => {
    getCase.mockResolvedValue(caseDetail({ status: 'PENDING', analyses: [] }));
    render(<CaseDetailPage />);
    expect(await screen.findByText(/has not been analysed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run analysis/i })).toBeInTheDocument();
  });

  it('hides clinical actions from users who cannot act on the case', async () => {
    getCase.mockResolvedValue(caseDetail({ canAct: false }));
    render(<CaseDetailPage />);
    await screen.findByText('Migraine without aura');
    expect(screen.queryByRole('button', { name: /re-run analysis/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/was this output useful/i)).not.toBeInTheDocument();
  });

  it('reports inaccessible cases without details', async () => {
    failNext = true;
    render(<CaseDetailPage />);
    expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument();
  });
});
