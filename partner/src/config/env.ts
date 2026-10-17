/**
 * On the iOS Simulator, `localhost` reaches the host Mac directly. On a
 * physical device or an Android emulator, `localhost` means the device
 * itself — set EXPO_PUBLIC_API_URL in .env to your dev machine's LAN IP for
 * on-device testing (see .env.example).
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
