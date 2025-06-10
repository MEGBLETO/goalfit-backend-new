import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    try {
      return await this.prisma.user.findUnique({ where: { id } });
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw new Error('User not found');
    }
  }

  async findBySub(sub: string) {
    try {
      return await this.prisma.user.findUnique({ where: { id: sub } });
    } catch (error) {}
  }

  async update(id: string, data: UpdateUserDto) {
    try {
      return await this.prisma.user.update({ where: { id }, data });
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  async delete(id: string) {
    try {
      return await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  async findAll(limit = 10, offset = 0) {
    try {
      return await this.prisma.user.findMany({
        take: limit,
        skip: offset,
      });
    } catch (error) {
      console.error('Error fetching all users:', error);
      throw new Error('Failed to fetch users');
    }
  }
}
