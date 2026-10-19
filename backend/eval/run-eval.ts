/**
 * Runs the synthetic evaluation set against the configured LLM provider.
 * Requires a real GROQ_API_KEY (this costs API credits). Exit code 1 on any failure.
 *
 *   GROQ_API_KEY=... npm run eval:llm
 */
import { readFileSync } from 'fs';
import * as path from 'path';
import { AppConfigService } from '../src/modules/config/config.service';
import { validateEnv } from '../src/modules/config/env.schema';
import { GroqProvider } from '../src/modules/llm/providers/groq.provider';
import { PromptsService } from '../src/modules/prompts/prompts.service';
import { SafetyService } from '../src/modules/safety/safety.service';
import { EvalCase, scoreCase } from './scoring';

async function main() {
  const env = validateEnv({ JWT_ACCESS_SECRET: 'eval-only-not-used-'.padEnd(40, 'x'), DATABASE_URL: 'unused', ...process.env, LLM_MOCK: 'false' });
  const config = new AppConfigService({ get: (k: keyof typeof env) => env[k] } as never);
  const provider = new GroqProvider(config);
  const prompts = new PromptsService();
  const safety = new SafetyService();
  const { cases } = JSON.parse(readFileSync(path.join(__dirname, 'cases.json'), 'utf8')) as { cases: EvalCase[] };

  console.log(`Prompt ${prompts.currentVersion} (${prompts.templateHash.slice(0, 12)}), model ${config.groqModelName}`);
  let failed = 0;
  for (const c of cases) {
    const pkg = prompts.buildClinicalPrompt(c.caseText, c.patientContext);
    try {
      const raw = await provider.generateClinicalAnalysis(pkg.userPrompt, pkg.systemPrompt);
      const { data, flags } = safety.validateAndSanitize(raw.content);
      const outcome = scoreCase(c, data, [...pkg.inputFlags, ...flags]);
      if (!outcome.passed) failed++;
      console.log(`${outcome.passed ? 'PASS' : 'FAIL'} ${c.id}${outcome.failures.length ? ' - ' + outcome.failures.join('; ') : ''}`);
    } catch (err) {
      failed++;
      console.log(`FAIL ${c.id} - ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(`${cases.length - failed}/${cases.length} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
