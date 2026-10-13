import { describe, expect, it } from 'vitest';
import { scrub, toSafeReport } from './report';

describe('safe error reporting', () => {
  it('scrubs phones, emails and long ids from messages and stacks', () => {
    const error = new Error('Failed for ada@example.com on 08031234567 (id 1234567890123456)');
    error.stack = `Error: ${error.message}\n    at pay (+234 803 123 4567)`;

    const report = toSafeReport(error, 'query');

    expect(report.scope).toBe('query');
    expect(report.message).toBe('Failed for [EMAIL] on [PHONE] (id [ID])');
    expect(report.stack).not.toMatch(/ada@example|0803|1234567890123456/);
  });

  it('wraps non-Error throws', () => {
    expect(toSafeReport('boom', 'realtime')).toMatchObject({ name: 'Error', message: 'boom' });
  });

  it('keeps undefined input undefined', () => {
    expect(scrub(undefined)).toBeUndefined();
  });
});
