export type AccessLevel = "no-access" | "read" | "read-write";

export interface RoleSummary {
  id: string | number;
  name: string;
  description?: string | null;
}

export interface Role extends RoleSummary {
  /**
   * Map of permission code → access level.
   * Example keys: "dashboard", "accounting", "selling", etc.
   */
  permissions?: Record<string, AccessLevel>;
}

export interface PermissionSummary {
  id: string | number;
  code: string;
  label: string;
  access_level: AccessLevel;
}

export interface User {
  id: string | number;
  email: string;
  username?: string;
  first_name?: string;
  middle_name?: string | null;
  last_name?: string | null;
  full_name: string;
  language?: string;
  time_zone?: string;
  status: "active" | "inactive";
  initials?: string;
  user_type?: string;
  phone?: string | null;
  address?: string | null;
  roles?: RoleSummary[];
}

export interface UserProfile {
  user_id: string | number;
  address?: string | null;
  cnic_front_path?: string | null;
  cnic_back_path?: string | null;
}

export interface Tag {
  id: string | number;
  name: string;
  color: string;
}

export interface Attachment {
  id: string | number;
  user_id: string | number;
  file_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}


