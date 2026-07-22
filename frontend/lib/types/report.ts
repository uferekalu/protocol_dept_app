// Mirrors backend/src/modules/reports/reports.service.ts's return shapes.
export interface MinisterDaysHosted {
  minister_id: string;
  full_name: string;
  total_days: number;
}

export interface MostActiveProtocolMember {
  protocol_member_id: string;
  full_name: string;
  status_update_count: number;
}

export interface ReportsStats {
  days_hosted_per_minister: MinisterDaysHosted[];
  most_active_protocol_members: MostActiveProtocolMember[];
  average_pickup_to_checkin_hours: number | null;
}
