import { Prisma, Role } from '@prisma/client';
import { AuthUser } from '../decorators/user.decorator';

/** The minimum a policy decision needs to know about a case. */
export interface CaseOwnership {
  doctorId: string;
  organizationId: string | null;
}

/**
 * Single source of truth for clinical-case access.
 *
 * - SUPER_ADMIN: may read every case.
 * - ORG_ADMIN: may read cases that belong to their own organization. An admin without an
 *   organization, or a case without one, never matches (null never equals null here).
 * - DOCTOR: may read only cases they created.
 *
 * Clinical actions (running analyses, uploading MRI, giving feedback) are reserved for the
 * treating doctor who owns the case. Administrators can review but not act clinically.
 */
export function canReadCase(user: AuthUser, clinicalCase: CaseOwnership): boolean {
  switch (user.role) {
    case Role.SUPER_ADMIN:
      return true;
    case Role.ORG_ADMIN:
      return sameOrganization(user.organizationId, clinicalCase.organizationId);
    case Role.DOCTOR:
      return clinicalCase.doctorId === user.userId;
    default:
      return false;
  }
}

export function canActOnCase(user: AuthUser, clinicalCase: CaseOwnership): boolean {
  return clinicalCase.doctorId === user.userId;
}

/** Prisma filter equivalent to `canReadCase`, for list queries. */
export function readableCasesWhere(user: AuthUser): Prisma.ClinicalCaseWhereInput {
  switch (user.role) {
    case Role.SUPER_ADMIN:
      return {};
    case Role.ORG_ADMIN:
      return user.organizationId ? { organizationId: user.organizationId } : { id: { in: [] } };
    case Role.DOCTOR:
      return { doctorId: user.userId };
    default:
      return { id: { in: [] } };
  }
}

/** True only when both ids are present and equal. */
export function sameOrganization(a: string | null | undefined, b: string | null | undefined): boolean {
  return Boolean(a) && Boolean(b) && a === b;
}

/** Whether an admin may manage a given user account (approve, suspend, reset password). */
export function canManageUser(admin: AuthUser, target: { organizationId: string | null; role: Role }): boolean {
  if (admin.role === Role.SUPER_ADMIN) {
    return true;
  }
  if (admin.role === Role.ORG_ADMIN) {
    return target.role === Role.DOCTOR && sameOrganization(admin.organizationId, target.organizationId);
  }
  return false;
}

/** Prisma filter for the users an admin may see in management views. */
export function manageableUsersWhere(admin: AuthUser): Prisma.UserWhereInput {
  if (admin.role === Role.SUPER_ADMIN) {
    return {};
  }
  if (admin.role === Role.ORG_ADMIN && admin.organizationId) {
    return { organizationId: admin.organizationId, role: Role.DOCTOR };
  }
  return { id: { in: [] } };
}
