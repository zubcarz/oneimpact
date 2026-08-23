import { View } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { BenefitItem } from '@/components/ui/BenefitItem';

describe('BenefitItem', () => {
  const benefit = {
    title: 'Tu iPass',
    description: 'Tu identidad digital de impacto, registra cada proyecto, logro y contribución.',
  };

  it('renders the title and description', () => {
    render(<BenefitItem icon={<View testID="icon" />} {...benefit} />);

    expect(screen.getByText(benefit.title)).toBeTruthy();
    expect(screen.getByText(benefit.description)).toBeTruthy();
  });

  it('does not expose the decorative icon as accessible text', () => {
    render(
      <BenefitItem
        icon={<View testID="icon" accessible={false} accessibilityElementsHidden />}
        {...benefit}
      />,
    );

    expect(screen.queryByTestId('icon')).toBeNull();
    expect(screen.getByTestId('icon', { includeHiddenElements: true })).toBeTruthy();
  });
});
