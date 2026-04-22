import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import {
  AccountProfile,
  AccountRole,
  AccountService,
} from '../account/account.service';
import { AccountStatus } from '../account/entities/account.entity';
import { CreateManagedAccountDto } from './dto/create-managed-account.dto';
import { UpdateManagedAccountDto } from './dto/update-managed-account.dto';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';

@Public()
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/accounts')
export class AdminAccountsController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  async list(): Promise<AccountProfile[]> {
    return this.accountService.listAccounts(AccountRole.AppUser);
  }

  @Post()
  async create(@Body() body: CreateManagedAccountDto): Promise<AccountProfile> {
    return this.accountService.createAccount({
      username: body.username,
      displayName: body.displayName,
      password: body.password,
      role: AccountRole.AppUser,
      status: body.status ?? AccountStatus.Active,
    });
  }

  @Patch(':accountId')
  async update(
    @Param('accountId') accountId: string,
    @Body() body: UpdateManagedAccountDto,
  ): Promise<AccountProfile> {
    return this.accountService.updateAccount(accountId, {
      displayName: body.displayName,
      password: body.password,
      status: body.status,
    });
  }
}
