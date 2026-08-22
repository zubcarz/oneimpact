import { render, screen } from '@testing-library/react-native';
import { ProgressBar } from '@/components/ui/ProgressBar';

describe('ProgressBar', () => {
  it('clamps a value above 100 down to 100', () => {
    render(<ProgressBar value={150} />);

    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(100);
  });

  it('clamps a negative value up to 0', () => {
    render(<ProgressBar value={-20} />);

    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(0);
  });

  it('reflects a normal value as-is', () => {
    render(<ProgressBar value={64} />);

    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(64);
  });
});
