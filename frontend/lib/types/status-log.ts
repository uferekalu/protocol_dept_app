// Mirrors backend/src/modules/status-logs/schemas/status-log.schema.ts.
// Read-only from the frontend's perspective — entries are only ever created by the
// backend as part of a guarded invitation status transition.
import { InvitationStatus } from './invitation';

export interface StatusLog {
  _id: string;
  invitation_id: string;
  status: InvitationStatus;
  timestamp: string;
  updated_by: string;
  notes?: string;
}
