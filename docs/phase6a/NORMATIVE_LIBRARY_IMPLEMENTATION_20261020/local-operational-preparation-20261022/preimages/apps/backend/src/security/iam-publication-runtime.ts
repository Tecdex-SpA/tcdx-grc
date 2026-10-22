import {loadInitialSourcePublication} from "./initial-source-lifecycle-publication.js";
import type { Kysely } from "kysely";
import type { BackendConfig, RuntimeEnvironment } from "../config.js";
import type { FoundationDatabase } from "../database.js";
import type { ApplicationTokenService } from "./application-token.js";
import { IamPublicationService, loadIamPublicationFiles } from "./iam-publication.js";
import { loadC04wLifecyclePublication } from "./c04w-lifecycle-publication.js";

/** Configures only the human-approved QA profile; absence keeps the machine boundary disabled. */
export async function configureQaIamPublication(db: Kysely<FoundationDatabase>, tokens: ApplicationTokenService,
  config: BackendConfig, env: RuntimeEnvironment) {
  const names = ["TCDX_IAM_M2M_PROFILE_FILE", "TCDX_IAM_M2M_PROFILE_SHA256", "TCDX_IAM_BINDINGS_FILE",
    "TCDX_IAM_BINDINGS_SHA256", "TCDX_IAM_DECISION_FILE", "TCDX_IAM_DECISION_SHA256",
    "TCDX_IAM_RBAC_R3_FILE", "TCDX_IAM_RBAC_R3_SHA256"] as const;
  const present = names.filter(name => env[name]);
  const c04wRoot = env.TCDX_C04W_PUBLICATION_ROOT;
  const c04wSha = env.TCDX_C04W_PUBLICATION_MANIFEST_SHA256;
  if (!!c04wRoot !== !!c04wSha || (!present.length && c04wRoot)) throw new Error("INCOMPLETE_C04W_PUBLICATION_CONFIGURATION");
  const initialRoot=env.TCDX_INITIAL_SOURCE_PUBLICATION_ROOT,initialSha=env.TCDX_INITIAL_SOURCE_PUBLICATION_MANIFEST_SHA256;
  if(!!initialRoot!==!!initialSha||(!present.length&&initialRoot)) throw new Error("INCOMPLETE_INITIAL_SOURCE_PUBLICATION_CONFIGURATION");
  if (!present.length) return undefined;
  if (present.length !== names.length || config.nodeEnv !== "qa") throw new Error("INCOMPLETE_OR_NON_QA_IAM_PUBLICATION_CONFIGURATION");
  const files = await loadIamPublicationFiles({ profilePath: env[names[0]]!, approvedProfileSha256: env[names[1]]!,
    bindingsPath: env[names[2]]!, approvedBindingsSha256: env[names[3]]!, decisionPath: env[names[4]]!, approvedDecisionSha256: env[names[5]]!,
    rbacResolutionPath: env[names[6]]!, approvedRbacResolutionSha256: env[names[7]]! });
  if (files.profile.issuer !== config.managedIdentityAdmin.issuer || files.profile.audience !== config.applicationJwt.audience)
    throw new Error("IAM_PROFILE_RUNTIME_IDENTITY_MISMATCH");
  const c04w = c04wRoot && c04wSha ? await loadC04wLifecyclePublication(c04wRoot, c04wSha) : undefined;
  const initial=initialRoot&&initialSha?await loadInitialSourcePublication(initialRoot,initialSha):undefined;
  const service = new IamPublicationService(db, tokens, files, IamPublicationService.credentialFile(files.profile.credential_ref), c04w, initial);
  tokens.configureMachineProfile({ profile: files.profile, resolvePrincipal: proof => service.resolvePrincipal(proof) }, config.nodeEnv);
  return service;
}
