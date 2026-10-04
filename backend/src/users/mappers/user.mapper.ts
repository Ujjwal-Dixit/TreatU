import type { User } from '@prisma/client';

export interface UserDto {
  id: string;
  phoneNumber: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
}

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    phoneNumber: user.phoneNumber,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}
