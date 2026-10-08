# STEP 23L-MI8A — release packaging and secret delivery contract

## Authority and boundary

Master regent: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23`.
This deployment amendment implements the human MI8A task packet, within rector 12, 26, 43, 45 and 46, active enforcement, the Managed Identity ADR and executable contract 22. The historical v1.1 ZIP is subordinate to the active versioned baseline and its amendments. MI6-SEC-001 remains owned by Andrés Barouh, expires 2027-04-02, and has no automatic renewal or scope expansion.

Authorization covers only immutable base references, existing Docker file secrets, runtime configuration references, preflight and reproducible theme packaging. It changes no product scope, identity architecture, permission, MFA proof, operation, database, service or UI behavior. It grants no deployment authority. Immutable baseline documents and material executable contracts remain unchanged.

Source paths: backend/frontend Dockerfiles; backend config loader, config tests and configuration preflight; QA compose and example configuration; this amendment and MASTER_EXECUTION_STATUS. IAM theme source and its already-pinned Dockerfile remain unchanged. No credentials are installed, generated or rotated by MI8A.

## Immutable packaging

Backend and both frontend stages use Node 22.23.2 bookworm-slim at index digest `sha256:48e4b67d85f87bd551df43704e24d252f56cc5f8e9718841aace50f19948f0f9`. IAM inherits Keycloak 26.7.5 at approved index digest `sha256:37dbaf6f0722c9ec246335f36e1ef8b2e6cb960f7c27e0d8c615121a3d475a85`. Release builds target linux/amd64, matching existing Phase 5 and MI4 runtime evidence. No functional base version changes. BuildKit attestations may vary by build; base/platform manifests, source fingerprint and provenance must be recorded separately from image IDs.

IAM COPY includes only the versioned theme. Protected runtime configuration, database state, realms, keys and credentials are never image/source inputs. MI9 must capture and preserve the actual IAM command, protected config mount, config fingerprint, limits and security options before replacement. No manual modification of a running container is a final packaging model.

## Protected runtime custody

Use the existing QA file-backed Docker secrets mechanism, not a new secret service. On backend host 192.168.2.45 the operational custodian owns:

| Host source outside Git | Read-only container target | Configuration reference |
| --- | --- | --- |
| /home/tecdex/.secrets/tcdx-grc-qa/managed-identity-oidc-client-secret | /run/secrets/managed_identity_oidc_client_secret | MANAGED_IDENTITY_OIDC_CLIENT_SECRET_FILE |
| /home/tecdex/.secrets/tcdx-grc-qa/managed-identity-admin-client-secret | /run/secrets/managed_identity_admin_client_secret | MANAGED_IDENTITY_ADMIN_CLIENT_SECRET_FILE |

Host references are `MANAGED_IDENTITY_OIDC_CLIENT_SECRET_HOST_FILE` and `MANAGED_IDENTITY_ADMIN_CLIENT_SECRET_HOST_FILE`. Files must be regular, nonempty, owner tecdex with numeric UID matching container node UID 1000, mode 0600 or stricter owner-readable equivalent (0400), parent directory 0700, and readable by the runtime. Local Compose file secrets use read-only bind mounts and preserve host ownership/mode; do not rely on Compose uid/gid/mode remapping. Verify actual host UID and mounted metadata during preflight. Do not weaken permissions to fix an owner mismatch.

The protected QA `.env` already delivers existing database/Zoho configuration at runtime. It must remain outside Git/source/image, owner tecdex and mode 0600, in a protected deployment directory; never use a world-readable environment file. Preserve existing credential authority. No secret literals may enter committed Compose, command arguments, Docker ARG/ENV/COPY, browser VITE configuration, logs, reports, snapshots or release archives. Both MI secrets reject inline configuration; absent, empty, unreadable and group/world-readable files fail configuration. File-only precedence is unambiguous. No defaults, silent disable or provider fallback compensate for an incomplete configured provider.

Frontend uses only public `VITE_API_ORIGIN`, canonical GRC origin, and backend provider/permission projections; it needs no Managed Identity secret. Existing IAM protected config custody remains `/home/tecdex/.config/tcdx-keycloak/`, mode 0600 and read-only mount, subject to actual MI9 capture. Do not renew bootstrap/admin credentials.

## Mandatory MI9 preflight before replacing healthy runtime

1. Verify DB read-only: 26 migrations, latest 20261001000100, 235 physical tables and 167 permissions. Capture running backend/frontend/IAM image IDs and sanitized IAM config fingerprint. No migration 27 or database rollback.
2. Custodian verifies protected `.env`, parent directories, both MI host files and existing application JWT/storage references: existence, regular-file type, nonempty material, numeric owner, owner-readable restrictive modes. Never print contents or expand secret values into a command line. If any material is absent, block with configuration NAME only; installation/rotation needs separate authorized operational action.
3. Build from the later MI8-R freeze without QA secrets, verify source/provenance/base/platform digests, transport images. Do not use the original MI8 freeze.
4. On the backend host, in the protected deployment directory, run `docker compose --env-file .env config --quiet`. Do not print rendered config. Then run `docker compose --env-file .env run --rm --no-deps --entrypoint node backend apps/backend/dist/managed-identity-config-preflight.js`. This future isolated candidate container performs no network/DB call, checks the same canonical loader and mounted owner/read-only restrictions, prints only PASS/BLOCKED, and does not replace healthy containers. A nonzero exit BLOCKS replacement.
5. Verify actual IAM config/command and amd64 platform against captured state, protected files readable/read-only, current IAM base provenance and existing realm theme selection. Missing prerequisites block IAM replacement; never bake or recreate state in the image.
6. Only a separately authorized MI9 may replace backend, then frontend, then IAM artifact, run required health/public discovery/JWKS/admin-denial/DB checks and roll back images on technical failure. Migration 26 remains forward-only.

## Freeze and gates

The original MI8 fingerprint `616b230ec2ea5c3ede40ff81a4c4d9f4fce39d49b5db6d6020cc2d1c217fbdf3` becomes historical evidence and is superseded for deployment when MI8A passes. MI8-R must revalidate and create the definitive new freeze. MI8A does not execute MI8-R or MI9. Multi-process session revocation remains PENDING_PHASE5_RUNTIME; named humans, second tenant code approval and human UI review remain pending. STEP 23L and Phase 6 remain blocked.
