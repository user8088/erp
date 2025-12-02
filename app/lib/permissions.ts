import type { AccessLevel, PermissionsMap } from "./types";

const rank: Record<AccessLevel, number> = {
  "no-access": 0,
  read: 1,
  "read-write": 2,
};

export function hasAtLeast(
  permissions: PermissionsMap,
  code: string,
  required: AccessLevel
): boolean {
  const current = permissions[code] ?? "no-access";
  return rank[current] >= rank[required];
}


