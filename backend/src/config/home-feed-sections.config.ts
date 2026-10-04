export const HOME_FEED_SECTION_KEYS = [
  'highestOffer',
  'openNearYou',
  'topPicks',
] as const;
export type HomeFeedSectionKey = (typeof HOME_FEED_SECTION_KEYS)[number];

export const HOME_FEED_SECTION_TITLES: Record<HomeFeedSectionKey, string> = {
  highestOffer: 'Highest offer',
  openNearYou: 'Open near you',
  topPicks: 'Top picks',
};
