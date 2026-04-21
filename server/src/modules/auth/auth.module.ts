import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsModule } from '../sms/sms.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthCodeEntity } from './entities/auth-code.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'replace-me'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES', '2h'),
        },
      }),
    }),
    TypeOrmModule.forFeature([AuthCodeEntity, RefreshTokenEntity]),
    UserModule,
    SmsModule,
    RateLimitModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
