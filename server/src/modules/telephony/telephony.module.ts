import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallEventEntity } from '../call-event/entities/call-event.entity';
import { CallSessionEntity } from '../call-session/entities/call-session.entity';
import { CallbackSessionEntity } from '../callback/entities/callback-session.entity';
import { DidInventoryEntity } from '../tenant/entities/did-inventory.entity';
import { TenantDidAssignmentEntity } from '../tenant/entities/tenant-did-assignment.entity';
import { TenantEndpointEntity } from '../tenant/entities/tenant-endpoint.entity';
import { TenantEntity } from '../tenant/entities/tenant.entity';
import { TelephonyController } from './telephony.controller';
import { TelephonyService } from './telephony.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TenantEntity,
      TenantDidAssignmentEntity,
      TenantEndpointEntity,
      DidInventoryEntity,
      CallSessionEntity,
      CallbackSessionEntity,
      CallEventEntity,
    ]),
  ],
  controllers: [TelephonyController],
  providers: [TelephonyService],
})
export class TelephonyModule {}
