import { Role } from '@prisma/client';
import { AuthUser } from '../decorators/user.decorator';
import { canActOnCase, canManageUser, canReadCase, readableCasesWhere, sameOrganization } from './case-access.policy';

const user = (role: Role, userId: string, organizationId: string | null): AuthUser => ({
  role,
  userId,
  organizationId,
  email: `${userId}@test`,
  mustChangePassword: false,
});

describe('case access policy', () => {
  const caseOf = (doctorId: string, organizationId: string | null) => ({ doctorId, organizationId });

  it('lets doctors read only their own cases', () => {
    const doc = user(Role.DOCTOR, 'd1', 'org1');
    expect(canReadCase(doc, caseOf('d1', 'org1'))).toBe(true);
    expect(canReadCase(doc, caseOf('d2', 'org1'))).toBe(false);
  });

  it('never treats two missing organizations as the same organization (regression)', () => {
    const orphanA = user(Role.DOCTOR, 'a', null);
    expect(canReadCase(orphanA, caseOf('b', null))).toBe(false);
    expect(sameOrganization(null, null)).toBe(false);
    expect(sameOrganization(undefined, undefined)).toBe(false);

    const orgAdminWithoutOrg = user(Role.ORG_ADMIN, 'adm', null);
    expect(canReadCase(orgAdminWithoutOrg, caseOf('b', null))).toBe(false);
    expect(readableCasesWhere(orgAdminWithoutOrg)).toEqual({ id: { in: [] } });
  });

  it('scopes org admins to their organization', () => {
    const admin = user(Role.ORG_ADMIN, 'adm', 'org1');
    expect(canReadCase(admin, caseOf('d1', 'org1'))).toBe(true);
    expect(canReadCase(admin, caseOf('d1', 'org2'))).toBe(false);
    expect(readableCasesWhere(admin)).toEqual({ organizationId: 'org1' });
  });

  it('reserves clinical actions for the owning doctor', () => {
    expect(canActOnCase(user(Role.DOCTOR, 'd1', 'o'), caseOf('d1', 'o'))).toBe(true);
    expect(canActOnCase(user(Role.SUPER_ADMIN, 's', null), caseOf('d1', 'o'))).toBe(false);
    expect(canActOnCase(user(Role.ORG_ADMIN, 'a', 'o'), caseOf('d1', 'o'))).toBe(false);
  });

  it('limits org admins to managing doctors in their organization', () => {
    const admin = user(Role.ORG_ADMIN, 'adm', 'org1');
    expect(canManageUser(admin, { organizationId: 'org1', role: Role.DOCTOR })).toBe(true);
    expect(canManageUser(admin, { organizationId: 'org2', role: Role.DOCTOR })).toBe(false);
    expect(canManageUser(admin, { organizationId: 'org1', role: Role.ORG_ADMIN })).toBe(false);
    expect(canManageUser(admin, { organizationId: null, role: Role.DOCTOR })).toBe(false);
    expect(canManageUser(user(Role.DOCTOR, 'd', 'org1'), { organizationId: 'org1', role: Role.DOCTOR })).toBe(false);
  });
});
