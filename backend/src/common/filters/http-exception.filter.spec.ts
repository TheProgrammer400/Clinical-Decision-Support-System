import { ArgumentsHost, BadRequestException, BadGatewayException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HttpExceptionFilter } from './http-exception.filter';

function run(exception: unknown) {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ requestId: 'req-1', method: 'GET', path: '/x' }),
    }),
  } as unknown as ArgumentsHost;
  const filter = new HttpExceptionFilter();
  (filter as unknown as { logger: { error: jest.Mock } }).logger = { error: jest.fn() };
  filter.catch(exception, host);
  return { status: (status.mock.calls[0] as unknown[])[0], body: json.mock.calls[0][0] };
}

describe('HttpExceptionFilter', () => {
  it('never leaks internal error details in 500 responses', () => {
    const { status, body } = run(new Error('connect ECONNREFUSED 10.0.0.5:5432 password=hunter2'));
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toMatch(/ECONNREFUSED|hunter2|10\.0\.0\.5/);
    expect(body.requestId).toBe('req-1');
  });

  it('keeps intentional 4xx messages', () => {
    const { status, body } = run(new BadRequestException('Passwords do not match'));
    expect(status).toBe(400);
    expect(body.message).toBe('Passwords do not match');
  });

  it('keeps deliberate gateway errors and their safe details', () => {
    const { status, body } = run(new BadGatewayException({ code: 'ANALYSIS_FAILED', message: 'safe', details: { analysisId: 'a1' } }));
    expect(status).toBe(502);
    expect(body).toMatchObject({ code: 'ANALYSIS_FAILED', message: 'safe', details: { analysisId: 'a1' } });
  });

  it('maps Prisma unique violations to 409 without exposing the query', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Unique constraint failed on users_email_key', { code: 'P2002', clientVersion: 'x' });
    const { status, body } = run(err);
    expect(status).toBe(409);
    expect(body.message).not.toMatch(/users_email_key/);
  });
});
