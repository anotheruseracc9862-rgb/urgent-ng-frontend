import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageLoading } from './page-loading';

describe('PageLoading', () => {
  it('shows the real heading and only placeholder cards', () => {
    render(<PageLoading title="Security" eyebrow="Account" cards={[100, 200]} />);

    expect(screen.getByRole('heading', { name: 'Security' })).toBeInTheDocument();
    expect(screen.getAllByLabelText('Loading')).toHaveLength(2);
  });
});
