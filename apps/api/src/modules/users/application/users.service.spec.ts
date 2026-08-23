import { Test } from '@nestjs/testing';
import type { User } from '@prisma/client';
import { DomainError } from '../../../common/errors/domain-error';
import { UsersRepository } from '../infrastructure/users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const buildUserRow = (overrides: Partial<User> = {}): User => ({
    id: 'user-1',
    email: 'carlos@example.com',
    passwordHash: 'argon2-hash',
    name: 'Carlos',
    role: 'USER',
    onboardingCompleted: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  const setup = async () => {
    const repository = {
      findById: jest.fn(),
      updateName: jest.fn(),
      list: jest.fn(),
      updateRole: jest.fn(),
      countAdmins: jest.fn(),
      markOnboardingCompleted: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, UsersRepository],
    })
      .overrideProvider(UsersRepository)
      .useValue(repository)
      .compile();

    return {
      service: moduleRef.get(UsersService),
      repository,
    };
  };

  describe('getProfile', () => {
    it('throws a DomainError with status 404 when the user does not exist', async () => {
      const { service, repository } = await setup();
      repository.findById.mockResolvedValue(null);

      await expect(service.getProfile('missing')).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
        status: 404,
      });
      await expect(service.getProfile('missing')).rejects.toBeInstanceOf(DomainError);
    });

    it('returns the profile shape without the password hash', async () => {
      const { service, repository } = await setup();
      repository.findById.mockResolvedValue(buildUserRow());

      const result = await service.getProfile('user-1');

      expect(result).toEqual({
        id: 'user-1',
        email: 'carlos@example.com',
        name: 'Carlos',
        role: 'USER',
      });
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('updateProfile', () => {
    it('only changes the name: it calls updateName with exactly the given id and name', async () => {
      const { service, repository } = await setup();
      repository.updateName.mockResolvedValue(buildUserRow({ name: 'Carlos Zubieta' }));

      const result = await service.updateProfile('user-1', { name: 'Carlos Zubieta' });

      expect(repository.updateName).toHaveBeenCalledTimes(1);
      expect(repository.updateName).toHaveBeenCalledWith('user-1', 'Carlos Zubieta');
      expect(repository.updateRole).not.toHaveBeenCalled();
      expect(result.name).toBe('Carlos Zubieta');
      expect(result.role).toBe('USER');
    });
  });

  describe('setRole', () => {
    it('throws a DomainError with status 404 when the user does not exist', async () => {
      const { service, repository } = await setup();
      repository.findById.mockResolvedValue(null);

      await expect(service.setRole('missing', 'ADMIN')).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
        status: 404,
      });
      await expect(service.setRole('missing', 'ADMIN')).rejects.toBeInstanceOf(DomainError);
    });

    it('throws LAST_ADMIN (409) when demoting the only remaining admin', async () => {
      const { service, repository } = await setup();
      repository.findById.mockResolvedValue(buildUserRow({ id: 'admin-1', role: 'ADMIN' }));
      repository.countAdmins.mockResolvedValue(1);

      await expect(service.setRole('admin-1', 'USER')).rejects.toMatchObject({
        code: 'LAST_ADMIN',
        status: 409,
      });
      expect(repository.updateRole).not.toHaveBeenCalled();
    });

    it('allows demoting an admin when at least one other admin remains', async () => {
      const { service, repository } = await setup();
      repository.findById.mockResolvedValue(buildUserRow({ id: 'admin-1', role: 'ADMIN' }));
      repository.countAdmins.mockResolvedValue(2);
      repository.updateRole.mockResolvedValue(buildUserRow({ id: 'admin-1', role: 'USER' }));

      const result = await service.setRole('admin-1', 'USER');

      expect(repository.updateRole).toHaveBeenCalledWith('admin-1', 'USER');
      expect(result.role).toBe('USER');
    });

    it('allows promoting a USER to ADMIN without checking countAdmins', async () => {
      const { service, repository } = await setup();
      repository.findById.mockResolvedValue(buildUserRow({ id: 'user-1', role: 'USER' }));
      repository.updateRole.mockResolvedValue(buildUserRow({ id: 'user-1', role: 'ADMIN' }));

      const result = await service.setRole('user-1', 'ADMIN');

      expect(repository.countAdmins).not.toHaveBeenCalled();
      expect(result.role).toBe('ADMIN');
    });
  });

  describe('listUsers', () => {
    it('returns users mapped to the profile shape as { items, total }', async () => {
      const { service, repository } = await setup();
      repository.list.mockResolvedValue({
        items: [buildUserRow(), buildUserRow({ id: 'user-2', email: 'ana@example.com' })],
        total: 2,
      });

      const result = await service.listUsers();

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).not.toHaveProperty('passwordHash');
    });
  });
});
