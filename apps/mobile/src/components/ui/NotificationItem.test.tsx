import { fireEvent, render, screen } from '@testing-library/react-native';
import type { NotificationItem as NotificationItemType } from '@oneimpact/shared';
import { NotificationItem } from './NotificationItem';

const UNREAD_NOTIFICATION: NotificationItemType = {
  id: 'notif-1',
  userId: 'user-1',
  type: 'WELCOME',
  title: 'Bienvenida',
  body: 'Tu primer punto ya esta registrado.',
  readAt: undefined,
  createdAt: '2026-08-24T10:00:00.000Z',
};

describe('NotificationItem', () => {
  it('calls onPress exactly once when an unread notification is pressed', () => {
    const onPress = jest.fn();
    render(<NotificationItem notification={UNREAD_NOTIFICATION} onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: UNREAD_NOTIFICATION.title }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
