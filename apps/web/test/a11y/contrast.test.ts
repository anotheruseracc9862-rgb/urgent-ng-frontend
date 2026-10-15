import { describe, expect, it } from 'vitest';

/** WCAG 2.x relative luminance and contrast ratio. */
function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((index) => {
    const channel = parseInt(value.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light! + 0.05) / (dark! + 0.05);
}

/** Text pairs the signed-in UI uses (design tokens in app/globals.css). Body text needs 4.5:1. */
const TEXT_PAIRS: [name: string, foreground: string, background: string][] = [
  ['ink on surface', '#17212e', '#ffffff'],
  ['ink-2 on surface', '#344154', '#ffffff'],
  ['ink-2 on panel', '#344154', '#f3f5f2'],
  ['muted on surface', '#637080', '#ffffff'],
  ['muted on panel', '#637080', '#f3f5f2'],
  ['muted on tint', '#637080', '#f4fbe6'],
  ['green-700 on surface', '#526f00', '#ffffff'],
  ['green-900 on tint-2', '#3b5000', '#eaf5cf'],
  ['white on green-800', '#ffffff', '#3b5000'],
  ['ok on ok-bg', '#145c30', '#e8f7ed'],
  ['amber text on amber-bg', '#7a4800', '#fff4de'],
  ['red text on red-bg', '#8f2a22', '#fff0ee'],
  ['blue text on blue-bg', '#1b3f8f', '#eaf1ff'],
  ['ink on lime', '#17212e', '#a6d445'],
];

describe('colour contrast of design tokens', () => {
  it.each(TEXT_PAIRS)('%s meets 4.5:1', (_name, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});
