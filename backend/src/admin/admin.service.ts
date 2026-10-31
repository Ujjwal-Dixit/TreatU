import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AppException } from '../common/exceptions/app.exception';
import { LAUNCH_CITY } from '../config/city.config';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';

export interface AdminOverviewDto {
  cityName: string;
  registeredUsers: number;
  totalBookings: number;
}

export interface AdminRestaurantDto {
  id: string;
  name: string;
  area: string;
  status: string;
  ownerPhoneNumber: string | null;
}

/** Opening hours a new restaurant starts with until its owner sets real
 * ones in the partner app. */
const DEFAULT_OPERATING_HOURS = [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
  dayOfWeek,
  openTime: '11:00',
  closeTime: '23:00',
}));

/** "12 Linking Road, Bandra West" -> "Bandra West". */
function areaOf(addressLine: string): string {
  const parts = addressLine.split(',');
  return parts[parts.length - 1]?.trim() ?? '';
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async getOverview(): Promise<AdminOverviewDto> {
    const [registeredUsers, totalBookings] = await Promise.all([
      this.prisma.user.count({ where: { role: 'customer' } }),
      this.prisma.claim.count({ where: { status: { not: 'cancelled' } } }),
    ]);
    return { cityName: LAUNCH_CITY.name, registeredUsers, totalBookings };
  }

  async listRestaurants(): Promise<AdminRestaurantDto[]> {
    const restaurants = await this.prisma.restaurant.findMany({
      where: { status: { not: 'removed' } },
      include: { owner: { select: { phoneNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return restaurants.map((r) => ({
      id: r.id,
      name: r.name,
      area: areaOf(r.addressLine),
      status: r.status,
      ownerPhoneNumber: r.owner?.phoneNumber ?? null,
    }));
  }

  async createRestaurant(
    dto: CreateRestaurantDto,
  ): Promise<AdminRestaurantDto> {
    const ownerUserId = dto.ownerPhoneNumber
      ? await this.ensureOwner(dto.ownerPhoneNumber)
      : null;

    const restaurant = await this.prisma.restaurant.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() ?? '',
        cuisines: dto.cuisines.map((c) => c.trim()),
        priceTier: dto.priceTier,
        addressLine: `${dto.streetAddress.trim()}, ${dto.area.trim()}`,
        city: LAUNCH_CITY.slug,
        latitude: dto.latitude,
        longitude: dto.longitude,
        timezone: LAUNCH_CITY.timezone,
        operatingHours: DEFAULT_OPERATING_HOURS,
        coverImageUrl: dto.coverImageUrl,
        galleryUrls: [],
        status: 'active',
        ownerUserId,
      },
    });
    return {
      id: restaurant.id,
      name: restaurant.name,
      area: dto.area.trim(),
      status: restaurant.status,
      ownerPhoneNumber: dto.ownerPhoneNumber ?? null,
    };
  }

  /** Soft delete: claims reference the restaurant, so the row stays for
   * booking history while it disappears from every customer list. The
   * owner is unlinked so the partner app (whose lookups are all by
   * ownerUserId) stops seeing it, and the owner can be given a new one. */
  async removeRestaurant(id: string): Promise<void> {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id, status: { not: 'removed' } },
    });
    if (!restaurant) {
      throw new AppException(
        'RESTAURANT_NOT_FOUND',
        'Restaurant not found.',
        HttpStatus.NOT_FOUND,
      );
    }
    await this.prisma.$transaction([
      this.prisma.restaurant.update({
        where: { id },
        data: { status: 'removed', ownerUserId: null },
      }),
      this.prisma.offer.updateMany({
        where: { restaurantId: id, status: { not: 'archived' } },
        data: { status: 'archived' },
      }),
      this.prisma.restaurantFeature.deleteMany({ where: { restaurantId: id } }),
    ]);
    this.realtime.publish({ type: 'offers.changed', restaurantId: id });
  }

  /** Finds or creates the owner account for a phone number. One restaurant
   * per owner, since the partner app shows a single restaurant. */
  private async ensureOwner(phoneNumber: string): Promise<string> {
    const existing = await this.prisma.user.findUnique({
      where: { phoneNumber },
      include: { ownedRestaurants: { select: { id: true } } },
    });
    if (existing?.role === 'admin') {
      throw new AppException(
        'OWNER_IS_ADMIN',
        'That number belongs to an admin account. Use a different owner number.',
      );
    }
    if (existing && existing.ownedRestaurants.length > 0) {
      throw new AppException(
        'OWNER_HAS_RESTAURANT',
        'That number already owns a restaurant. Remove it first or use a different number.',
        HttpStatus.CONFLICT,
      );
    }
    if (existing) {
      await this.prisma.user.update({
        where: { id: existing.id },
        data: { role: 'restaurant_owner' },
      });
      return existing.id;
    }
    const created = await this.prisma.user.create({
      data: { phoneNumber, name: 'Restaurant Owner', role: 'restaurant_owner' },
    });
    return created.id;
  }
}
