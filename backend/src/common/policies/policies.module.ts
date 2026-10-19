import { Global, Module } from '@nestjs/common';
import { CaseAccessService } from './case-access.service';

@Global()
@Module({
  providers: [CaseAccessService],
  exports: [CaseAccessService],
})
export class PoliciesModule {}
