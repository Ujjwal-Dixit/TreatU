import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from '@/auth/auth-context';
import { Colors } from '@/constants/theme';
import { queryClient } from '@/lib/query-client';
import { RealtimeSync } from '@/realtime/realtime-sync';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootStack />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootStack() {
  const { isAuthenticated, isHydrated } = useAuth();

  // Keep the splash up until the stored session has been read, so a
  // logged-in owner never sees a flash of the login screen on launch.
  useEffect(() => {
    if (isHydrated) void SplashScreen.hideAsync();
  }, [isHydrated]);

  if (!isHydrated) return null;

  return (
    <>
      {isAuthenticated && <RealtimeSync />}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="login" />
        <Stack.Screen name="verify" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="customers-today" />
        <Stack.Screen name="restaurant-details" />
        <Stack.Screen name="opening-hours" />
      </Stack.Protected>
      </Stack>
    </>
  );
}
