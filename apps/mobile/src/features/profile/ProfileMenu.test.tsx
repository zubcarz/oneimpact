import { fireEvent, render, screen } from '@testing-library/react-native';
import { ProfileMenu } from './ProfileMenu';

describe('ProfileMenu', () => {
  it('does not render the admin panel row for a regular user', () => {
    render(
      <ProfileMenu
        role="USER"
        unreadNotifications={0}
        onSignOut={jest.fn()}
        onAdminPress={jest.fn()}
      />,
    );

    expect(screen.queryByText('Panel admin')).toBeNull();
    expect(screen.queryByLabelText('Panel admin')).toBeNull();
  });

  it('renders the admin panel row and calls onAdminPress once when pressed', () => {
    const onAdminPress = jest.fn();
    render(
      <ProfileMenu
        role="ADMIN"
        unreadNotifications={0}
        onSignOut={jest.fn()}
        onAdminPress={onAdminPress}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Panel admin' }));

    expect(onAdminPress).toHaveBeenCalledTimes(1);
  });
});
