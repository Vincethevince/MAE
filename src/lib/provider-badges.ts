export type BadgeKey = "topRated" | "popular" | "new";

export function getProviderBadges(provider: {
  rating: number;
  review_count: number;
  created_at: string;
}): BadgeKey[] {
  const badges: BadgeKey[] = [];
  if (provider.rating >= 4.8 && provider.review_count >= 5) badges.push("topRated");
  if (provider.review_count >= 10) badges.push("popular");
  const createdAt = new Date(provider.created_at);
  const ageMs = Date.now() - createdAt.getTime();
  if (ageMs < 60 * 24 * 60 * 60 * 1000) badges.push("new"); // 60 days in ms
  return badges;
}
