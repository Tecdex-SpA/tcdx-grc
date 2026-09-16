import type { Principal } from "@tcdx-grc/shared-types";
import { FoundationError } from "../errors.js";

export type VerifiedIdentity = Principal & { tokenId: string; expiresAt: Date };

export interface IdentityVerifier {
  verifyBearerToken(token: string): Promise<VerifiedIdentity>;
}

export class BlockedIdentityVerifier implements IdentityVerifier {
  async verifyBearerToken(_token: string): Promise<VerifiedIdentity> {
    throw new FoundationError("TCDX.AUTHENTICATION.INVALID", "Authentication runtime is not configured", 401);
  }
}
