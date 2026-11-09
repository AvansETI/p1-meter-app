import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Hourglass from './Hourglass';

describe('Hourglass', () => {
  it('announces the text as a status, with a decorative icon', () => {
    render(<Hourglass label="Kosten berekenen…" />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Kosten berekenen…');
    expect(status.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
