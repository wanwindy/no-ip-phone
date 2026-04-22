import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DidInventoryEntity } from './entities/did-inventory.entity';
import { TenantDidAssignmentEntity } from './entities/tenant-did-assignment.entity';
import { TenantEndpointEntity } from './entities/tenant-endpoint.entity';
import { TenantMemberEntity } from './entities/tenant-member.entity';
import { TenantEntity } from './entities/tenant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TenantEntity,
      TenantMemberEntity,
      DidInventoryEntity,
      TenantDidAssignmentEntity,
      TenantEndpointEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class TenantModule {}
