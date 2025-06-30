import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SubscriptionService } from '../subscription/subscription.service';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => SubscriptionService))
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async findById(id: string) {
    try {
      if (!id) {
        throw new BadRequestException('User ID cannot be null.');
      }
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          profile: {
            include: {
              dietaryPreferences: true,
              availability: true,
              goals: true,
            },
          },
        },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      const subscription =
        await this.subscriptionService.getUserSubscription(id);
      return { ...user, subscription };
    } catch (error) {
      console.error(
        `[UserService:findById] Error finding user by ID ${id}:`,
        error,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Could not fetch user data.');
    }
  }

  async findBySub(sub: string) {
    try {
      if (!sub) {
        throw new BadRequestException('User SUB cannot be null.');
      }
      const user = await this.prisma.user.findUnique({
        where: { id: sub },
        include: {
          profile: {
            include: {
              dietaryPreferences: true,
              availability: true,
              goals: true,
            },
          },
        },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      const subscription =
        await this.subscriptionService.getUserSubscription(sub);
      return { ...user, subscription };
    } catch (error) {
      console.error(
        `[UserService:findBySub] Error finding user by SUB ${sub}:`,
        error,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Could not fetch user data.');
    }
  }

  async update(id: string, data: UpdateUserDto) {
    try {
      const userFields: any = {
        name: data.firstName || data.name,
        surname: data.lastName || data.surname,
        email: data.email,
        contact: data.contact,
      };

      Object.keys(userFields).forEach((key) => {
        if (userFields[key] === undefined) {
          delete userFields[key];
        }
      });

      if (userFields.contact) {
        const existingUser = await this.prisma.user.findFirst({
          where: { contact: userFields.contact, NOT: { id } },
        });
        if (existingUser) {
          throw new BadRequestException(
            'Contact number is already in use by another account.',
          );
        }
      }

      const profileFields: any = {
        gender: data.gender,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        height: data.height,
        weight: data.weight,
        objectiveWeight: data.objectiveWeight,
        fitnessLevel: data.fitnessLevel,
        equipment: data.equipment,
        healthConsiderations: data.healthConsiderations,
      };

      Object.keys(profileFields).forEach((key) => {
        if (profileFields[key] === undefined) {
          delete profileFields[key];
        }
      });

      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: userFields,
        include: {
          profile: true,
        },
      });

      let profile = updatedUser.profile;
      if (!profile) {
        profile = await this.prisma.userProfile.create({
          data: { userId: id },
        });
      }

      if (Object.keys(profileFields).length > 0) {
        await this.prisma.userProfile.update({
          where: { id: profile.id },
          data: profileFields,
        });
      }

      if (data.dietaryPreferences && data.dietaryPreferences.length > 0) {
        const existingDietary = await this.prisma.dietaryPreference.findUnique({
          where: { userId: profile.id },
        });

        if (existingDietary) {
          await this.prisma.dietaryPreference.update({
            where: { userId: profile.id },
            data: {
              restrictions: data.dietaryPreferences,
            },
          });
        } else {
          await this.prisma.dietaryPreference.create({
            data: {
              userId: profile.id,
              type: 'restrictions',
              restrictions: data.dietaryPreferences,
              dislikes: [],
            },
          });
        }
      }

      if (data.availability) {
        const existingAvailability = await this.prisma.availability.findUnique({
          where: { userId: profile.id },
        });

        if (existingAvailability) {
          await this.prisma.availability.update({
            where: { userId: profile.id },
            data: {
              daysPerWeek: data.availability.daysPerWeek,
              minutesPerDay: data.availability.minutesPerDay,
            },
          });
        } else {
          await this.prisma.availability.create({
            data: {
              userId: profile.id,
              daysPerWeek: data.availability.daysPerWeek,
              minutesPerDay: data.availability.minutesPerDay,
            },
          });
        }
      }

      if (data.goal) {
        await this.prisma.goal.deleteMany({
          where: { userId: profile.id },
        });

        await this.prisma.goal.create({
          data: {
            userId: profile.id,
            name: data.goal,
          },
        });
      }

      const finalUser = await this.prisma.user.findUnique({
        where: { id },
        include: {
          profile: {
            include: {
              dietaryPreferences: true,
              availability: true,
              goals: true,
            },
          },
        },
      });

      return finalUser;
    } catch (error) {
      console.error(`[UserService:update] Error updating user ${id}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update user.');
    }
  }

  async updateFirstLogin(id: string) {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: { firstLogin: false },
      });
    } catch (error) {
      console.error(
        `[UserService:updateFirstLogin] Error for user ${id}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to update first login status.',
      );
    }
  }

  async delete(id: string) {
    try {
      // Delete related weight entries first
      await this.prisma.userWeightEntry.deleteMany({ where: { userId: id } });
      return await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      console.error(`[UserService:delete] Error deleting user ${id}:`, error);
      throw new InternalServerErrorException('Failed to delete user.');
    }
  }

  async findAll(limit = 10, offset = 0) {
    try {
      return await this.prisma.user.findMany({
        take: limit,
        skip: offset,
        include: {
          profile: true,
        },
      });
    } catch (error) {
      console.error(`[UserService:findAll] Error fetching users:`, error);
      throw new InternalServerErrorException('Failed to fetch users.');
    }
  }

  async addWeightEntry(userId: string, weight: number, date?: Date) {
    try {
      if (!userId || !weight) {
        throw new BadRequestException('UserId and weight are required.');
      }
      return await this.prisma.userWeightEntry.create({
        data: {
          userId,
          weight,
          date: date || new Date(),
        },
      });
    } catch (error) {
      console.error(
        `[UserService:addWeightEntry] Error for user ${userId}:`,
        error,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not add weight entry.');
    }
  }

  async getWeightEntries(userId: string) {
    try {
      if (!userId) {
        throw new BadRequestException('UserId is required.');
      }
      return await this.prisma.userWeightEntry.findMany({
        where: { userId },
        orderBy: { date: 'asc' },
      });
    } catch (error) {
      console.error(
        `[UserService:getWeightEntries] Error for user ${userId}:`,
        error,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Could not retrieve weight entries.',
      );
    }
  }
}
