import Groq from 'groq-sdk';
import { LlmProviderError } from '../interfaces/llm-provider.interface';
import { GroqProvider } from './groq.provider';

const config = { groqApiKey: 'gsk_test', groqModelName: 'configured-model', groqRequestTimeoutMs: 1000 } as never;

function providerWith(create: jest.Mock) {
  const provider = new GroqProvider(config);
  (provider as unknown as { client: unknown }).client = { chat: { completions: { create } } };
  return provider;
}

describe('GroqProvider', () => {
  it('returns content, the model reported by the provider and token usage', async () => {
    const create = jest.fn().mockResolvedValue({
      model: 'actual-model-id',
      choices: [{ message: { content: '{"a":1}' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });
    const res = await providerWith(create).generateClinicalAnalysis('u', 's');
    expect(res).toMatchObject({ content: '{"a":1}', model: 'actual-model-id', isMock: false, tokenUsage: { totalTokens: 15 } });
    expect(create.mock.calls[0][0].messages[0]).toEqual({ role: 'system', content: 's' });
  });

  it('treats an empty completion as a provider failure, never as an empty result', async () => {
    const create = jest.fn().mockResolvedValue({ choices: [{ message: { content: '  ' } }] });
    await expect(providerWith(create).generateClinicalAnalysis('u', 's')).rejects.toMatchObject({ code: 'LLM_EMPTY_RESPONSE' });
  });

  it('maps timeouts and client errors to stable codes', async () => {
    const timeout = jest.fn().mockRejectedValue(new Groq.APIConnectionTimeoutError({ message: 'timed out' }));
    await expect(providerWith(timeout).generateClinicalAnalysis('u', 's')).rejects.toMatchObject({ code: 'LLM_TIMEOUT', retriable: true });

    const rejected = jest.fn().mockRejectedValue(Groq.APIError.generate(400, { error: { message: 'bad' } }, 'bad', new Headers()));
    await expect(providerWith(rejected).generateClinicalAnalysis('u', 's')).rejects.toMatchObject({ code: 'LLM_REQUEST_REJECTED', retriable: false });
  });

  it('opens the circuit after repeated service failures and fails fast', async () => {
    const create = jest.fn().mockRejectedValue(new Error('ECONNRESET'));
    const provider = providerWith(create);
    for (let i = 0; i < 5; i++) {
      await expect(provider.generateClinicalAnalysis('u', 's')).rejects.toBeInstanceOf(LlmProviderError);
    }
    await expect(provider.generateClinicalAnalysis('u', 's')).rejects.toMatchObject({ code: 'LLM_UNAVAILABLE' });
    expect(create).toHaveBeenCalledTimes(5);
  });
});
