import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { validateCaseForm } from '@/lib/case-form';
import NewCasePage from './new/page';

const createCase = vi.fn();
vi.mock('next/navigation', () => ({ usePathname: () => '/cases/new', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/lib/session', () => ({
  RequireAuth: ({ children }: { children: React.ReactNode }) => children,
  useSession: () => ({ user: { role: 'DOCTOR' }, signOut: vi.fn() }),
}));
vi.mock('@/lib/api-client', () => ({ ApiError: class extends Error {}, apiClient: { createCase: (...a: unknown[]) => createCase(...a) } }));

describe('New case form', () => {
  it('starts with no assumed patient characteristics or history', () => {
    render(<NewCasePage />);
    for (const select of screen.getAllByRole('combobox')) {
      expect((select as HTMLSelectElement).value).toBe('');
    }
    expect(screen.queryByRole('list', { name: /history entries/i })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Hypertension|Hyperlipidemia/);
  });

  it('refuses to submit until the clinician has chosen each context field', async () => {
    render(<NewCasePage />);
    await userEvent.type(screen.getByLabelText(/history of present illness/i), 'Patient with headache for three days.');
    await userEvent.click(screen.getByRole('button', { name: /run decision-support analysis/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/select age group, sex and acuity/i);
    expect(createCase).not.toHaveBeenCalled();
  });

  it('validates input', () => {
    expect(validateCaseForm({ caseText: 'short', ageGroup: 'adult', sex: 'm', acuity: 'acute' })).toMatch(/at least 10/);
    expect(validateCaseForm({ caseText: 'long enough text', ageGroup: 'not_specified', sex: 'not_specified', acuity: 'not_specified' })).toBeNull();
  });
});
