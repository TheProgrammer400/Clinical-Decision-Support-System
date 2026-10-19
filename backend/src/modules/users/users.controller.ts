import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { AllowPasswordChangeRequired } from '../auth/decorators/allow-password-change-required.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @AllowPasswordChangeRequired()
  getProfile(@CurrentUser('userId') userId: string) {
    return this.usersService.findById(userId);
  }
}
