// Mirrors backend/src/modules/events/schemas/event.schema.ts and its DTOs.
export interface Event {
  _id: string;
  name: string;
  start_date: string;
  end_date: string;
  venue: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventInput {
  name: string;
  start_date: string;
  end_date: string;
  venue: string;
  description?: string;
}

export type UpdateEventInput = Partial<CreateEventInput>;
