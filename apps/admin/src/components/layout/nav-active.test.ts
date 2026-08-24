import { describe, expect, it } from 'vitest';
import { isNavItemActive } from './nav-active';

describe('isNavItemActive', () => {
  it('matches the exact route', () => {
    expect(isNavItemActive('/projects', '/projects')).toBe(true);
    expect(isNavItemActive('/dashboard', '/dashboard')).toBe(true);
  });

  it('matches a sub route of the item', () => {
    expect(isNavItemActive('/projects/new', '/projects')).toBe(true);
    expect(isNavItemActive('/projects/abc-123', '/projects')).toBe(true);
    expect(isNavItemActive('/projects/abc-123/updates', '/projects')).toBe(true);
  });

  it('does not match a sibling route that shares the prefix', () => {
    expect(isNavItemActive('/projects-x', '/projects')).toBe(false);
    expect(isNavItemActive('/projectsx/new', '/projects')).toBe(false);
    expect(isNavItemActive('/users-admin', '/users')).toBe(false);
  });

  it('does not match a different route', () => {
    expect(isNavItemActive('/users', '/projects')).toBe(false);
    expect(isNavItemActive('/dashboard', '/subscriptions')).toBe(false);
  });

  it('does not match a parent route', () => {
    expect(isNavItemActive('/projects', '/projects/new')).toBe(false);
  });

  it('keeps the root href from activating every screen', () => {
    expect(isNavItemActive('/', '/')).toBe(true);
    expect(isNavItemActive('/projects', '/')).toBe(false);
    expect(isNavItemActive('/dashboard', '/')).toBe(false);
  });

  it('ignores trailing slashes on both sides', () => {
    expect(isNavItemActive('/projects/', '/projects')).toBe(true);
    expect(isNavItemActive('/projects', '/projects/')).toBe(true);
    expect(isNavItemActive('/projects/new/', '/projects/')).toBe(true);
  });
});
