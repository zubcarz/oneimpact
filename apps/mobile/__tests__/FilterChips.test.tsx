import { fireEvent, render, screen } from '@testing-library/react-native';
import { FilterChips } from '@/components/ui/FilterChips';

describe('FilterChips', () => {
  const items = [
    { value: 'all', label: 'Todas' },
    { value: 'amazonia', label: 'Amazonía' },
    { value: 'mexico', label: 'México' },
  ];

  it('renders one chip per item', () => {
    render(<FilterChips items={items} value="all" onChange={jest.fn()} />);

    for (const item of items) {
      expect(screen.getByRole('button', { name: item.label })).toBeTruthy();
    }
  });

  it('calls onChange once with the value of the pressed chip', () => {
    const onChange = jest.fn();
    render(<FilterChips items={items} value="all" onChange={onChange} />);

    fireEvent.press(screen.getByRole('button', { name: 'México' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('mexico');
  });

  it('exposes accessibilityState.selected on the active chip only', () => {
    render(<FilterChips items={items} value="amazonia" onChange={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Amazonía' }).props.accessibilityState.selected).toBe(
      true,
    );
    expect(screen.getByRole('button', { name: 'Todas' }).props.accessibilityState.selected).toBe(
      false,
    );
    expect(screen.getByRole('button', { name: 'México' }).props.accessibilityState.selected).toBe(
      false,
    );
  });
});
