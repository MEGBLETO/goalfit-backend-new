import {
  Controller,
  Get,
  Param,
  Put,
  Delete,
  Body,
  Query,
  NotFoundException,
  UseGuards,
  Request,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getCurrentUser(@Request() req) {
    const user = await this.userService.findById(req.user.userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Get('weight')
  @ApiOperation({ summary: 'Get all weight entries for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Weight entries retrieved successfully',
  })
  async getWeightEntries(@Request() req) {
    const userId = req.user.userId;
    return this.userService.getWeightEntries(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    const user = await this.userService.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Get('/sub/:sub')
  @ApiOperation({ summary: 'Get user by sub (JWT subject)' })
  @ApiParam({ name: 'sub', description: 'JWT subject (user ID)' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserBySub(@Param('sub') sub: string) {
    const user = await this.userService.findBySub(sub);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(id, updateUserDto);
  }

  @Patch(':id/first-login')
  @ApiOperation({ summary: 'Update first login status' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'First login status updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateFirstLogin(@Param('id') id: string) {
    return this.userService.updateFirstLogin(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') id: string) {
    return this.userService.delete(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of users to return',
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of users to skip',
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllUsers(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.userService.findAll(limit, offset);
  }

  @Post('weight')
  @ApiOperation({ summary: 'Add a new weight entry for the current user' })
  @ApiBody({
    schema: {
      properties: {
        weight: { type: 'number' },
        date: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Weight entry created successfully',
  })
  async addWeightEntry(
    @Request() req,
    @Body() body: { weight: number; date?: string },
  ) {
    const userId = req.user.userId;
    const { weight, date } = body;
    return this.userService.addWeightEntry(
      userId,
      weight,
      date ? new Date(date) : undefined,
    );
  }
}
