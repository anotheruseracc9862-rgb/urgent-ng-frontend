import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InfoDisclosure, InfoNote } from './info-disclosure';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function stubViewport(wide: boolean) {
  let listener: (() => void) | undefined;
  const list = {
    matches: wide,
    addEventListener: (_: string, fn: () => void) => { listener = fn; },
    removeEventListener: () => { listener = undefined; },
  };
  vi.stubGlobal('matchMedia', () => list);
  return (matches: boolean) => { list.matches = matches; listener?.(); };
}

describe('InfoDisclosure', () => {
  it('is folded on a phone, behind one line that opens it', () => {
    stubViewport(false);
    render(<InfoDisclosure title="Tips and what runners see"><p>Name the item.</p></InfoDisclosure>);
    const details = screen.getByText('Tips and what runners see').closest('details')!;
    expect(details.open).toBe(false);
    details.open = true;
    expect(details.open).toBe(true);
  });

  it('is open on a wide screen, and follows the window when it is resized', () => {
    const resize = stubViewport(true);
    render(<InfoDisclosure title="Tips"><p>Name the item.</p></InfoDisclosure>);
    const details = screen.getByText('Tips').closest('details')!;
    expect(details.open).toBe(true);
    act(() => resize(false));
    expect(details.open).toBe(false);
  });

  it('keeps its content in the page once, for screen readers and search', () => {
    stubViewport(false);
    render(<InfoDisclosure title="Tips"><p>Name the item.</p></InfoDisclosure>);
    expect(screen.getAllByText('Name the item.')).toHaveLength(1);
  });
});

describe('InfoNote', () => {
  it('is plain text with an icon, not a box', () => {
    render(<InfoNote>Payment is made directly to the runner.</InfoNote>);
    const note = screen.getByText(/Payment is made directly/).closest('p')!;
    expect(note.className).not.toMatch(/\bbg-|\bborder\b|shadow/);
  });
});
