import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Alert } from '@urgent/ui';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Alert', () => {
  it('brings an error into view when it appears, so it is not missed below or above the fold', () => {
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    render(<Alert variant="danger" role="alert">That did not work.</Alert>);
    expect(scroll).toHaveBeenCalledTimes(1);
    // It only moves the page if the alert is not already visible.
    expect(scroll).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' });
  });

  it('leaves notices, warnings and quiet status messages where they are', () => {
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    render(
      <>
        <Alert role="status">Saved.</Alert>
        <Alert variant="warn" role="status">Careful.</Alert>
        <Alert variant="info">Heads up.</Alert>
        <Alert variant="danger">An error style with no alert role is only decoration.</Alert>
      </>,
    );
    expect(scroll).not.toHaveBeenCalled();
  });

  it('still hands its element to a caller that asked for it', () => {
    const seen: Array<HTMLDivElement | null> = [];
    render(<Alert variant="danger" role="alert" ref={(node) => { seen.push(node); }}>Oops</Alert>);
    expect(seen[0]).toBeInstanceOf(HTMLDivElement);
  });
});
