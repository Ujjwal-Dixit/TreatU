import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  AdminService,
  type AdminOverviewDto,
  type AdminRestaurantDto,
} from './admin.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  getOverview(): Promise<AdminOverviewDto> {
    return this.adminService.getOverview();
  }

  @Get('restaurants')
  listRestaurants(): Promise<AdminRestaurantDto[]> {
    return this.adminService.listRestaurants();
  }

  @Post('restaurants')
  createRestaurant(
    @Body() dto: CreateRestaurantDto,
  ): Promise<AdminRestaurantDto> {
    return this.adminService.createRestaurant(dto);
  }

  @Delete('restaurants/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRestaurant(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.adminService.removeRestaurant(id);
  }
}
