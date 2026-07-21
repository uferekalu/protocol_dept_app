import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ProtocolMemberRole } from '../enums';

function makeContext(user?: { role: ProtocolMemberRole }): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows the request when the route has no @Roles() metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(makeContext({ role: ProtocolMemberRole.MEMBER }))).toBe(true);
  });

  it('allows the request when the user has one of the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([
      ProtocolMemberRole.ADMIN,
      ProtocolMemberRole.COORDINATOR,
    ]);

    expect(guard.canActivate(makeContext({ role: ProtocolMemberRole.COORDINATOR }))).toBe(true);
  });

  it('denies the request when the user has none of the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([ProtocolMemberRole.ADMIN]);

    expect(guard.canActivate(makeContext({ role: ProtocolMemberRole.MEMBER }))).toBe(false);
  });

  it('denies the request when there is no authenticated user at all', () => {
    reflector.getAllAndOverride.mockReturnValue([ProtocolMemberRole.ADMIN]);

    expect(guard.canActivate(makeContext(undefined))).toBe(false);
  });
});
