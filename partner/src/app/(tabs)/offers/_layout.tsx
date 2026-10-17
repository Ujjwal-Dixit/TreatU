import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

/** Opening /offers/new or /offers/:id from Home still puts the list
 * underneath, so back from a deep-linked screen lands on the Offers list
 * instead of leaving the tab empty. */
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function OffersLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }} />;
}
