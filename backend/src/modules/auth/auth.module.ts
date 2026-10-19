import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DefaultCredentialsCheck } from './default-credentials.check';
import { MfaService } from './mfa.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, MfaService, DefaultCredentialsCheck],
  exports: [AuthService, JwtStrategy, PassportModule, MfaService],
})
export class AuthModule {}
