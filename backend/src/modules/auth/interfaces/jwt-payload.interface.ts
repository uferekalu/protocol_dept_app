import { ProtocolMemberRole } from '../../../common/enums';

// The decoded shape of every JWT this API issues. `sub` is the protocol member's id
// (standard JWT claim name for "subject") — role travels in the token itself so
// RolesGuard never needs a database round-trip to authorize a request.
export interface JwtPayload {
  sub: string;
  role: ProtocolMemberRole;
}
