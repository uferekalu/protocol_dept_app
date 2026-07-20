// Mirrors backend/src/modules/ministers/schemas/minister.schema.ts and its DTOs.
export interface Minister {
  _id: string;
  full_name: string;
  title: string;
  phone_number: string;
  email?: string;
  home_church_or_parish: string;
  photo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMinisterInput {
  full_name: string;
  title: string;
  phone_number: string;
  email?: string;
  home_church_or_parish: string;
  photo?: string;
  notes?: string;
}

export type UpdateMinisterInput = Partial<CreateMinisterInput>;
