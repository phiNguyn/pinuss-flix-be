export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredActiveDays: number;
  tier: "bronze" | "silver" | "gold" | "special";
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: "first_visit",
    name: "Người mới",
    description: "Ghé Pinuss Flix lần đầu",
    icon: "sparkles",
    requiredActiveDays: 1,
    tier: "bronze",
  },
  {
    id: "week_regular",
    name: "Fan tuần",
    description: "Ghé thăm 7 ngày",
    icon: "flame",
    requiredActiveDays: 7,
    tier: "bronze",
  },
  {
    id: "summer_spark",
    name: "Tia nắng hè",
    description: "Ghé thăm 14 ngày",
    icon: "sun",
    requiredActiveDays: 14,
    tier: "silver",
  },
  {
    id: "month_master",
    name: "Bậc thầy tháng",
    description: "Ghé thăm 30 ngày",
    icon: "crown",
    requiredActiveDays: 30,
    tier: "gold",
  },
  {
    id: "century_club",
    name: "Câu lạc bộ 100",
    description: "Ghé thăm 100 ngày",
    icon: "trophy",
    requiredActiveDays: 100,
    tier: "special",
  },
];

export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((b) => b.id === id);
}

export function getBadgesForActiveDays(days: number): BadgeDefinition[] {
  return BADGE_DEFINITIONS.filter((b) => days >= b.requiredActiveDays);
}
