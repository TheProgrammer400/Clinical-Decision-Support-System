import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

@Injectable()
export class OrgScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User authentication context missing');
    }

    // Super admins bypass single-org boundary constraints
    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    const targetOrgId = request.params.orgId || request.body.organizationId || request.query.organizationId;
    if (targetOrgId && user.organizationId && targetOrgId !== user.organizationId) {
      throw new ForbiddenException('Access denied: Action requested outside user tenant organization scope');
    }

    return true;
  }
}
