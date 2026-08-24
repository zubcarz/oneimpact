import { render, screen } from '@testing-library/react-native';
import { JourneyLine } from './JourneyLine';

describe('JourneyLine', () => {
  it('renders 3 active dots and 9 inactive dots for activeMonths=3', () => {
    render(<JourneyLine activeMonths={3} totalPoints={3} />);

    const activeIndexes = [0, 1, 2];
    const inactiveIndexes = Array.from({ length: 9 }, (_, i) => i + 3);

    activeIndexes.forEach((index) => {
      expect(screen.getByTestId(`journey-dot-${index}`).props.className).toContain('bg-accent');
    });
    inactiveIndexes.forEach((index) => {
      expect(screen.getByTestId(`journey-dot-${index}`).props.className).toContain('bg-gray-200');
    });
  });

  it('shows the months and points summary text in Spanish', () => {
    render(<JourneyLine activeMonths={3} totalPoints={3} />);

    expect(screen.getByText('3 meses · 3 puntos permanentes')).toBeTruthy();
  });
});
