// Browser smoke test across frontend + backend + database (LLM in explicit mock mode).
import { chromium } from 'playwright';

const BASE = process.env.FRONTEND_URL ?? 'http://localhost:3000';
const DOCTOR_PW = process.env.SEED_DOCTOR_PASSWORD ?? 'initial-doctor-pass-1';
const ADMIN_PW = process.env.SEED_ADMIN_PASSWORD ?? 'initial-admin-pass-1';
const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' - ' + extra : ''}`);
};

const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const consoleErrors = [];
const failedResponses = [];
page.on('response', (r) => r.status() >= 400 && failedResponses.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`));
// Resource-load failures are classified via failedResponses below; other console errors are bugs.
page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('Failed to load resource') && !m.text().startsWith('Failed to fetch RSC payload') && consoleErrors.push(m.text()));
const thirdParty = [];
page.on('request', (r) => {
  const u = new URL(r.url());
  if (!['localhost', '127.0.0.1'].includes(u.hostname)) thirdParty.push(u.hostname);
});

async function login(email, password) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

// --- doctor: forced password change on first sign-in
await login(process.env.SEED_DOCTOR_EMAIL ?? 'doctor@cdss.local', DOCTOR_PW);
await page.waitForURL('**/account/password');
check('seeded account is forced to change password', page.url().endsWith('/account/password'));
await page.getByLabel('Current password').fill(DOCTOR_PW);
await page.getByLabel('New password', { exact: true }).fill('doctor-new-password-1');
await page.getByLabel('Confirm new password').fill('doctor-new-password-1');
await page.getByRole('button', { name: 'Change password' }).click();
await page.waitForURL('**/dashboard');
check('password change leads to dashboard', true);
const totalTile = page.locator('section[aria-label="Case statistics"] > div').first();
await totalTile.filter({ hasText: /Total cases\s*0$/ }).waitFor({ timeout: 10000 }).catch(() => {});
check('dashboard shows zero cases (no fabricated counts)', /Total cases\s*0$/.test((await totalTile.textContent()).trim()), await totalTile.textContent());

// --- create a case
await page.goto(`${BASE}/cases/new`);
const selects = page.getByRole('combobox');
check('new-case selects start empty', (await selects.evaluateAll((els) => els.map((e) => e.value))).every((v) => v === ''));
check('no pre-filled history', !(await page.content()).includes('Hypertension'));
await page.getByLabel(/history of present illness/i).fill('Patient with severe headache for three days and photophobia.');
await page.getByRole('button', { name: /run decision-support analysis/i }).click();
check('submitting without context is blocked', await page.getByRole('alert').filter({ hasText: /select age group/i }).isVisible());
await page.getByLabel(/age group/i).selectOption('adult');
await page.getByLabel(/^sex/i).selectOption('not_specified');
await page.getByLabel(/onset acuity/i).selectOption('acute');
await page.getByRole('button', { name: /run decision-support analysis/i }).click();
await page.waitForURL(/\/cases\/[0-9a-f-]{36}$/);
await page.getByRole('heading', { name: /synthetic output from the development mock/i }).waitFor();
check('mock output is labelled as synthetic', true);
const body = await page.locator('body').textContent();
check('no fabricated clinical text on case page', !/biliary|cholelithiasis|right upper quadrant|Dr\. Shrey/i.test(body));
check('provenance shown', /prompt v1\.5\.0/.test(body));

// --- session survives reload (memory token restored via refresh cookie)
await page.reload();
await page.getByRole('heading', { name: /synthetic output from the development mock/i }).waitFor();
check('session restored after reload', true);
check('no access token in localStorage', !JSON.stringify(await page.evaluate(() => ({ ...localStorage }))).includes('eyJ'));

// --- history list
await page.goto(`${BASE}/cases`);
await page.getByText(/patient with severe headache/i).first().waitFor();
check('case history lists the case', true);

// --- sign out, protected route redirects
await page.getByRole('button', { name: /logout/i }).click();
await page.waitForURL(/\/login/);
await page.goto(`${BASE}/dashboard`);
await page.waitForURL(/\/login/);
check('protected page redirects to login after sign-out', true);

// --- admin
await login(process.env.SEED_ADMIN_EMAIL ?? 'admin@cdss.local', ADMIN_PW);
await page.waitForURL('**/account/password');
await page.getByLabel('Current password').fill(ADMIN_PW);
await page.getByLabel('New password', { exact: true }).fill('admin-new-password-1');
await page.getByLabel('Confirm new password').fill('admin-new-password-1');
await page.getByRole('button', { name: 'Change password' }).click();
await page.waitForURL('**/admin/dashboard');
await page.getByText('Component health (measured now)').waitFor();
const adminText = await page.locator('main').textContent();
check('admin dashboard has no hardcoded GPU telemetry', !/GTX|62%|71%/.test(adminText));
check('inference service reported as down (it is not running)', /MRI inference service.*down/i.test(adminText));
await page.goto(`${BASE}/admin/audit-logs`);
await page.getByText('auth.password_changed').first().waitFor();
check('audit trail records password changes', true);

check('no third-party network requests', thirdParty.length === 0, [...new Set(thirdParty)].join(','));
// Expected: refresh attempts without a session cookie return 401.
const unexpected = failedResponses.filter((f) => !/^401 POST \/api\/v1\/auth\/refresh$/.test(f));
check('no unexpected failed requests', unexpected.length === 0, unexpected.join(' | '));
check('no browser console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
