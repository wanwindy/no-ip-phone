import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallEventEntity } from '../call-event/entities/call-event.entity';
import { CallSessionEntity } from '../call-session/entities/call-session.entity';
import { CallbackSessionEntity } from '../callback/entities/callback-session.entity';
import { DidInventoryEntity } from '../tenant/entities/did-inventory.entity';
import { TenantDidAssignmentEntity } from '../tenant/entities/tenant-did-assignment.entity';
import { TenantEndpointEntity } from '../tenant/entities/tenant-endpoint.entity';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CallSessionEntity,
      CallbackSessionEntity,
      CallEventEntity,
      DidInventoryEntity,
      TenantDidAssignmentEntity,
      TenantEndpointEntity,
    ]),
  ],
  controllers: [CallsController],
  providers: [CallsService],
  exports: [CallsService],
})
export class CallsModule {}
