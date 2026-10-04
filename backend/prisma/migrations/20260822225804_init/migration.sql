-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('customer', 'restaurant_owner', 'admin');

-- CreateEnum
CREATE TYPE "RestaurantStatus" AS ENUM ('pending', 'active', 'paused', 'rejected');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('active', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "OfferAvailabilityStatus" AS ENUM ('active', 'exhausted', 'expired');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('claimed', 'redeemed', 'expired', 'cancelled');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'customer',
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_requests" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "owner_user_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "cuisines" TEXT[],
    "price_tier" INTEGER NOT NULL,
    "address_line" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timezone" TEXT NOT NULL,
    "operating_hours" JSONB NOT NULL,
    "cover_image_url" TEXT NOT NULL,
    "gallery_urls" TEXT[],
    "rating_avg" DECIMAL(2,1) NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "status" "RestaurantStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_features" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "section_key" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurant_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "discount_percentage" INTEGER NOT NULL,
    "days_of_week" INTEGER[],
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "min_spend_paise" INTEGER,
    "capacity_per_day" INTEGER NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_availabilities" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "capacity_total" INTEGER NOT NULL,
    "capacity_claimed" INTEGER NOT NULL DEFAULT 0,
    "status" "OfferAvailabilityStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "offer_availability_id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "redemption_code" TEXT NOT NULL,
    "discount_percentage_snapshot" INTEGER NOT NULL,
    "min_spend_paise_snapshot" INTEGER,
    "status" "ClaimStatus" NOT NULL DEFAULT 'claimed',
    "claimed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "otp_requests_phone_number_idx" ON "otp_requests"("phone_number");

-- CreateIndex
CREATE INDEX "restaurants_city_status_idx" ON "restaurants"("city", "status");

-- CreateIndex
CREATE INDEX "restaurant_features_section_key_rank_idx" ON "restaurant_features"("section_key", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_features_restaurant_id_section_key_key" ON "restaurant_features"("restaurant_id", "section_key");

-- CreateIndex
CREATE INDEX "offers_restaurant_id_status_idx" ON "offers"("restaurant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "offer_availabilities_offer_id_date_key" ON "offer_availabilities"("offer_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "claims_redemption_code_key" ON "claims"("redemption_code");

-- CreateIndex
CREATE INDEX "claims_user_id_status_idx" ON "claims"("user_id", "status");

-- CreateIndex
CREATE INDEX "claims_restaurant_id_claimed_at_idx" ON "claims"("restaurant_id", "claimed_at");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_restaurant_id_key" ON "favorites"("user_id", "restaurant_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_features" ADD CONSTRAINT "restaurant_features_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_availabilities" ADD CONSTRAINT "offer_availabilities_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_offer_availability_id_fkey" FOREIGN KEY ("offer_availability_id") REFERENCES "offer_availabilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
