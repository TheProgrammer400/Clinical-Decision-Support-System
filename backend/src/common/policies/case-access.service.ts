import { Injectable, NotFoundException } from '@nestjs/common';
import { ClinicalCase } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthUser } from '../decorators/user.decorator';
import { canActOnCase, canReadCase } from './case-access.policy';

export type CaseAccessMode = 'read' | 'act';

/**
 * Loads a case and enforces the access policy. Unauthorized access is reported exactly
 * like a missing case (404) so the API does not reveal which case ids exist.
 */
@Injectable()
export class CaseAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getCaseOrThrow(user: AuthUser, caseId: string, mode: CaseAccessMode = 'read'): Promise<ClinicalCase> {
    const clinicalCase = await this.prisma.clinicalCase.findUnique({ where: { id: caseId } });
    if (!clinicalCase || !this.isAllowed(user, clinicalCase, mode)) {
      throw new NotFoundException('Clinical case not found');
    }
    return clinicalCase;
  }

  isAllowed(user: AuthUser, clinicalCase: { doctorId: string; organizationId: string | null }, mode: CaseAccessMode) {
    return mode === 'act' ? canActOnCase(user, clinicalCase) : canReadCase(user, clinicalCase);
  }
}
