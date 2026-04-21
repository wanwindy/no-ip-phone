import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, UserStatus } from './entities/user.entity';

export interface PublicUserProfile {
  id: string;
  phone: string;
  status: UserStatus;
  createdAt: string;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async findOrCreate(phone: string): Promise<UserEntity> {
    const existing = await this.usersRepository.findOne({ where: { phone } });
    if (existing) {
      return existing;
    }

    const user = this.usersRepository.create({
      phone,
      status: UserStatus.Active,
      lastLoginAt: new Date(),
    });
    return this.usersRepository.save(user);
  }

  async touchLastLoginAt(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      lastLoginAt: new Date(),
    });
  }

  async findById(userId: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { id: userId } });
  }

  async getPublicProfile(userId: string): Promise<PublicUserProfile | null> {
    const user = await this.findById(userId);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      phone: this.maskPhone(user.phone),
      status: user.status,
      createdAt: user.createdAt.toISOString(),
    };
  }

  maskPhone(phone: string): string {
    if (phone.length !== 11) {
      return phone;
    }

    return `${phone.slice(0, 3)}****${phone.slice(7)}`;
  }
}
