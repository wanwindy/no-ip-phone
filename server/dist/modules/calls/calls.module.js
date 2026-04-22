"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const call_event_entity_1 = require("../call-event/entities/call-event.entity");
const call_session_entity_1 = require("../call-session/entities/call-session.entity");
const callback_session_entity_1 = require("../callback/entities/callback-session.entity");
const did_inventory_entity_1 = require("../tenant/entities/did-inventory.entity");
const tenant_did_assignment_entity_1 = require("../tenant/entities/tenant-did-assignment.entity");
const tenant_endpoint_entity_1 = require("../tenant/entities/tenant-endpoint.entity");
const calls_controller_1 = require("./calls.controller");
const calls_service_1 = require("./calls.service");
let CallsModule = class CallsModule {
};
exports.CallsModule = CallsModule;
exports.CallsModule = CallsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                call_session_entity_1.CallSessionEntity,
                callback_session_entity_1.CallbackSessionEntity,
                call_event_entity_1.CallEventEntity,
                did_inventory_entity_1.DidInventoryEntity,
                tenant_did_assignment_entity_1.TenantDidAssignmentEntity,
                tenant_endpoint_entity_1.TenantEndpointEntity,
            ]),
        ],
        controllers: [calls_controller_1.CallsController],
        providers: [calls_service_1.CallsService],
        exports: [calls_service_1.CallsService],
    })
], CallsModule);
