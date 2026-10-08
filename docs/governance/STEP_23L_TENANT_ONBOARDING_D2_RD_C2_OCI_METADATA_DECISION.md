# DR-STEP23L-TENANT-D2-RD-C2-OCI-SOURCE-2026-10-07

| Field | Approved value |
|---|---|
| Status | APPROVED_BY_HUMAN_AUTHORITY |
| Owner / approver | Andrés Barouh, Architecture Owner, Security Reviewer and QA Release Owner |
| Date | 2026-10-07 |
| Authority | TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23; rector 26, 45 and 46; MI8A packaging contract |
| Approval source | Explicit human STEP 23L-TENANT-ONBOARDING-D2-RD-C2 task packet in this session, sections 1–9, 20 and 32 |
| Scope | Tecdex GRC backend deployment runtime-preservation gate; approved D2 QA retry only |
| Exact provenance allowlist | org.opencontainers.image.source |

## Problem and decision

C1 located the D2 image's explicit build source label and Docker Engine's inheritance into container Config.Labels. The prior full-Config comparator rejected this descriptive addition. Its value is the verified public canonical repository URL, with no secret material and no functional/runtime effect in the inspected application and topology. C1 left the policy blocked instead of inferring an exception.

Andrés Barouh explicitly approves separating this exact OCI image provenance key from functional container runtime configuration. The deployment gate validates its security, source validity and nonfunctional classification separately, and may normalize only Config.Labels["org.opencontainers.image.source"] for functional equality. The label remains in the immutable image and inherited container metadata. No image or container operation removes it.

There is no wildcard exclusion, no org.opencontainers namespace exclusion and no exclusion of all labels. Every other label, including revision, source.tree, Compose management labels and future/unknown keys, remains subject to exact equality and fail-closed rejection. New metadata classifications require another explicit rector decision. The sole authorized source value for this exact release is the public repository URL https://github.com/Tecdex-SpA/tcdx-grc, validated against canonical repository metadata and the immutable release chain.

All functional configuration remains exact: Env, Cmd, Entrypoint, User/actual UID, WorkingDir, ExposedPorts/PortBindings, mounts and permissions, secret sources/destinations/read-only semantics, network mode/endpoints/aliases, DNS, governed hostname semantics, restart policy, healthcheck, security options/capabilities/read-only settings/resources, public/DB/OIDC configuration and canonical origins. Existing generated Hostname/Domainname handling is unchanged. Full HostConfig and all remaining Config fields remain compared. This is not a generic Docker metadata policy.

## Alternatives resolved by the human packet

Packaging removal/rebuild, broad label exclusion and a general metadata policy are not authorized. The approved path is this one-key separately validated comparator classification, using the existing exact release. No product behavior, permission, functional executable contract, database or infrastructure topology changes.

## Exact release reuse

The human also approves reuse without rebuilding, conditional on fresh exact verification:

- Source fingerprint: 498cad9e5f61e5108bc5fbe12725c5c53af7058744885accbbc5cea4f6dacc76.
- Freeze SHA256: ec43d7bf68d152cf894d80496a76bc884774acdb92cbaa43cabec06d64f2e491.
- Backend image ID: sha256:7c69fd4acc4301579e86d001001a207232d6e880157e8ad3156a27f0436af5f1.
- Backend tag: tcdx-grc-backend:tenant-d2-498cad9e5f61.
- Transport SHA256: 483eb00795f061f7ec38e6dee24e4354c7c0d62dcce9d538ab266fb1fc9d1ae5.
- Backend rollback image: sha256:7446ac5b691ddf1efa76bdc38de97c8ffae1b4f30821167fa50789f591a6c7dd.

Any mismatch blocks deployment; no equivalent artifact, mutable tag authority or rebuild may substitute. The temporary deployment comparator/runbook lives outside product source and implements this exact decision only. New freeze/image/transport are not required. Existing source, Dockerfile, image and transport remain unchanged.

## Evidence custody and rollback

Candidate logs and safe container/image/start/health/restart/failure metadata must be captured, sanitized and persisted before candidate removal or destructive rollback. This applies to health/configuration/security/OIDC/fatal and every rollback trigger. On success, retain sanitized logs through the complete postcheck window. Never persist raw protected environment, secrets, credential hashes, tokens, cookies or private keys. Capture has a bounded operational interval; rollback remains backend-only, using the retained original object/image. Do not roll back migration 20261006000200, frontend, IAM or DB data.

The gate reports runtime equality, the exact approved provenance delta, other-label difference count and unapproved configuration difference count. Both latter counts must be zero. Any additional difference stops advancement, preserves candidate evidence and triggers the authorized backend rollback; no improvisation.

## Unlocked gate and boundaries

This record closes C1's missing metadata decision and authorizes only the exact C2 backend retry and nonmutating postchecks. It does not itself declare runtime PASS or release completion. No frontend/IAM deployment, rebuild, product/Dockerfile/migration/functional-contract change, tenant/user/Membership/role/subscription mutation, real-person authenticated discovery, ACME remediation, andres.grc activation, R3/D3 execution, commit/push/merge or Phase 6 is authorized.

Evidence: /tmp/tcdx-grc-step23l-tenant-onboarding-d2-rd-c1-{report,image-labels,comparator,provenance,remediation,rollback-state}.md; C2 decision/preflight/config/deploy/runtime/log/security/rollback receipts and MASTER_EXECUTION_STATUS append. The immutable baseline is unchanged.
