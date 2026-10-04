import { HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma, Restaurant } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/exceptions/app.exception';
import { getLocalDateTimeParts } from '../common/time/timezone.util';
import { operatingHoursSchema } from '../common/schemas/operating-hours.schema';
import { CATEGORIES, matchesCategory } from '../config/categories.config';
import {
  HOME_FEED_SECTION_KEYS,
  HOME_FEED_SECTION_TITLES,
  type HomeFeedSectionKey,
} from '../config/home-feed-sections.config';
import { LAUNCH_CITY } from '../config/city.config';
import {
  OffersService,
  type OccurrenceWithOffer,
} from '../offers/offers.service';
import {
  toOfferCardDto,
  type OfferCardDto,
} from '../offers/mappers/offer.mapper';
import {
  toRestaurantCardDto,
  toRestaurantDetailDto,
  type RestaurantCardDto,
  type RestaurantDetailDto,
} from './mappers/restaurant.mapper';
import { ListRestaurantsQueryDto } from './dto/list-restaurants.query.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

export interface HomeFeedDto {
  categories: typeof CATEGORIES;
  sections: {
    key: HomeFeedSectionKey;
    title: string;
    restaurants: RestaurantCardDto[];
  }[];
}

export interface RestaurantListPage {
  items: RestaurantCardDto[];
  nextCursor: string | null;
}

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly offersService: OffersService,
  ) {}

  async getHomeFeed(currentUserId?: string): Promise<HomeFeedDto> {
    const favoritedIds = await this.getFavoritedIdSet(currentUserId);

    const sections = await Promise.all(
      HOME_FEED_SECTION_KEYS.map(async (key) => {
        const features = await this.prisma.restaurantFeature.findMany({
          where: { sectionKey: key, restaurant: { status: 'active' } },
          orderBy: { rank: 'asc' },
          take: 10,
          include: { restaurant: true },
        });
        const restaurants = await Promise.all(
          features.map((f) => this.buildCard(f.restaurant, favoritedIds)),
        );
        return { key, title: HOME_FEED_SECTION_TITLES[key], restaurants };
      }),
    );

    return { categories: CATEGORIES, sections };
  }

  async listRestaurants(
    query: ListRestaurantsQueryDto,
    currentUserId?: string,
  ): Promise<RestaurantListPage> {
    const limit = query.limit ?? 20;
    const favoritedIds = await this.getFavoritedIdSet(currentUserId);

    const baseWhere: Prisma.RestaurantWhereInput = {
      city: LAUNCH_CITY.slug,
      status: 'active',
    };
    if (query.search) {
      baseWhere.name = { contains: query.search, mode: 'insensitive' };
    }

    if (query.category) {
      // Category matching is a case-insensitive substring match against
      // free-text cuisine tags (see categories.config.ts), which a Postgres
      // array column can't filter directly. MVP restaurant counts are small
      // (hand-curated, single city), so filtering in-memory over the full
      // active set is simpler and still correct; move to a normalized
      // category join if this ever needs to scale past that.
      const all = await this.prisma.restaurant.findMany({
        where: baseWhere,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
      const matched = all.filter((r) =>
        matchesCategory(r.cuisines, query.category as string),
      );
      const startIndex = query.cursor
        ? matched.findIndex((r) => r.id === query.cursor) + 1
        : 0;
      const page = matched.slice(startIndex, startIndex + limit);
      const hasNext = startIndex + limit < matched.length;
      const items = await Promise.all(
        page.map((r) => this.buildCard(r, favoritedIds)),
      );
      const lastItem = page.at(-1);
      return { items, nextCursor: hasNext && lastItem ? lastItem.id : null };
    }

    const restaurants = await this.prisma.restaurant.findMany({
      where: baseWhere,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      take: limit + 1,
    });

    const hasNext = restaurants.length > limit;
    const page = hasNext ? restaurants.slice(0, limit) : restaurants;
    const items = await Promise.all(
      page.map((r) => this.buildCard(r, favoritedIds)),
    );
    const lastItem = page.at(-1);
    return { items, nextCursor: hasNext && lastItem ? lastItem.id : null };
  }

  async getRestaurantDetail(
    id: string,
    currentUserId?: string,
  ): Promise<RestaurantDetailDto> {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id, status: 'active' },
    });
    if (!restaurant) {
      throw new AppException(
        'RESTAURANT_NOT_FOUND',
        'Restaurant not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    const { active, past } = await this.offersService.getTodayOccurrences(
      restaurant.id,
      restaurant.timezone,
    );
    const { time } = getLocalDateTimeParts(restaurant.timezone);
    const activeOffers = active.map((occ) => this.toCard(occ, time));
    const pastOffersToday = past.map((occ) =>
      this.toCard(occ, time, 'expired'),
    );

    const favoritedIds = await this.getFavoritedIdSet(currentUserId);
    return toRestaurantDetailDto(restaurant, {
      isFavorited: favoritedIds.has(restaurant.id),
      activeOffers,
      pastOffersToday,
    });
  }

  async addFavorite(userId: string, restaurantId: string): Promise<void> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new AppException(
        'RESTAURANT_NOT_FOUND',
        'Restaurant not found.',
        HttpStatus.NOT_FOUND,
      );
    }
    await this.prisma.favorite.upsert({
      where: { userId_restaurantId: { userId, restaurantId } },
      update: {},
      create: { userId, restaurantId },
    });
  }

  async removeFavorite(userId: string, restaurantId: string): Promise<void> {
    await this.prisma.favorite.deleteMany({ where: { userId, restaurantId } });
  }

  async listFavorites(userId: string): Promise<RestaurantCardDto[]> {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: { restaurant: true },
      orderBy: { createdAt: 'desc' },
    });
    const favoritedIds = new Set(favorites.map((f) => f.restaurantId));
    return Promise.all(
      favorites.map((f) => this.buildCard(f.restaurant, favoritedIds)),
    );
  }

  // --- restaurant-owner management -----------------------------------

  async getOwnRestaurant(ownerUserId: string): Promise<Restaurant> {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { ownerUserId },
    });
    if (!restaurant) {
      throw new AppException(
        'RESTAURANT_NOT_FOUND',
        'No restaurant is linked to this account.',
        HttpStatus.NOT_FOUND,
      );
    }
    return restaurant;
  }

  async updateOwnRestaurant(
    ownerUserId: string,
    dto: UpdateRestaurantDto,
  ): Promise<Restaurant> {
    const restaurant = await this.getOwnRestaurant(ownerUserId);
    const { operatingHours, ...rest } = dto;

    let parsedOperatingHours: Prisma.InputJsonValue | undefined;
    if (operatingHours !== undefined) {
      const parsed = operatingHoursSchema.safeParse(operatingHours);
      if (!parsed.success) {
        throw new AppException(
          'INVALID_OPERATING_HOURS',
          'operatingHours is malformed.',
          HttpStatus.BAD_REQUEST,
          {
            issues: parsed.error.issues,
          },
        );
      }
      parsedOperatingHours = parsed.data;
    }

    return this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        ...rest,
        ...(parsedOperatingHours
          ? { operatingHours: parsedOperatingHours }
          : {}),
      },
    });
  }

  // --- shared helpers ---------------------------------------------------

  private async getFavoritedIdSet(userId?: string): Promise<Set<string>> {
    if (!userId) return new Set();
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      select: { restaurantId: true },
    });
    return new Set(favorites.map((f) => f.restaurantId));
  }

  private toCard(
    occurrence: OccurrenceWithOffer,
    currentTime: string,
    overrideStatus?: OfferCardDto['status'],
  ): OfferCardDto {
    return toOfferCardDto(
      this.offersService,
      occurrence.offer,
      occurrence.availability,
      currentTime,
      overrideStatus,
    );
  }

  /** N+1 by design at MVP scale: one getTodayOccurrences query per
   * restaurant card. Fine for a hand-curated, single-city restaurant count;
   * batch this (one query across all restaurant IDs) if/when listing pages
   * grow past a few dozen restaurants. */
  private async buildCard(
    restaurant: Restaurant,
    favoritedIds: Set<string>,
  ): Promise<RestaurantCardDto> {
    const { active } = await this.offersService.getTodayOccurrences(
      restaurant.id,
      restaurant.timezone,
    );
    const { time } = getLocalDateTimeParts(restaurant.timezone);

    const best = active.reduce<OccurrenceWithOffer | null>(
      (acc, occ) =>
        !acc || occ.offer.discountPercentage > acc.offer.discountPercentage
          ? occ
          : acc,
      null,
    );

    return toRestaurantCardDto(restaurant, {
      isFavorited: favoritedIds.has(restaurant.id),
      bestActiveOffer: best ? this.toCard(best, time) : null,
    });
  }
}
