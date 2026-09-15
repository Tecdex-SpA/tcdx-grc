# Permission catalog

| Campo | Valor |
|---|---|
| Contract owner | Security & Privacy Reviewer |
| Approving human roles | Product Owner/CPO, Architecture Owner, Security & Privacy Reviewer, domain owner |
| Status | `BLOCKED` |

## Authorization contract

```text
authenticated identity
→ active tenant membership
→ enabled plan-version entitlement/capability
→ explicit Permission grant through active Role assignment
→ allowed scope resolved from canonical object relations
→ object policy
→ segregation of duties
→ ALLOW; otherwise DENY
```

Role, permission, scope, ownership, plan, capability and entitlement are never interchangeable. UI visibility is not authorization. Exports inherit the exact read scope. Machine identities use ServicePrincipal permissions; they do not share human accounts.

## Permission registry grammar

`permission_code = domain.resource.action`. Domains, resources and maximum potential actions are exactly those in rector 22 §10. Potential does not mean granted. A code is executable only after a human-approved registry row and seed manifest exist.

Every row must contain:

`permission_code | capability_group/atomic capability | action | resource | allowed scopes | tenant boundary | base roles | entitlement interaction | SoD | sensitive flag | audit requirement | rector source`.

## Frozen scopes and actions

- Actions: `read, create, update, submit, review, approve, reject, verify, assign, transition, archive, delete, export, execute, configure, administer, publish, impersonate`.
- Scopes: `platform, tenant, organizational_unit, process, service, audit_engagement, assigned_object, owned_object`.
- Object scope is resolved from database relationships, never trusted from client parameters.
- A broader scope is never inferred from a narrower one. Multi-scope policy must explicitly choose ANY or ALL.

## Sensitive operations

`administer`, `approve`, `verify`, `publish`, `impersonate`, credential access, methodology/rule/permission changes, erasure/purge and regulated pack publication require reinforced audit. Secrets remain non-returnable even with `read`.

## Mandatory SoD

- evidence submitter ≠ evidence approver when policy applies;
- action completer ≠ verifier when policy applies;
- audit test executor ≠ final conclusion approver when independence applies;
- risk acceptance requester ≠ approver;
- global methodology/rule author ≠ approver;
- connector configurator ≠ privileged credential approver under reinforced policy;
- pack author/importer ≠ sole approver.

An exception requires an explicit published policy, reason and AuditEvent; no implicit bypass exists.

## Base roles

Platform roles: Platform Admin, Platform Support. Tenant roles are the 24 immutable baseline roles from rector 42. Custom tenant roles compose approved Permission rows and cannot modify baseline roles. Platform Support has no implicit impersonation permission. Tenant Admin has no blanket approval permission.

## Entitlement matrix

The only capability groups are the 20 exact codes in rector 42. `ISO`, `ISO_RIESGO_OPERATIVO` and `GRC` enable those groups exactly as specified there. Capability groups are not permissions. Atomic capability codes and mapping to each permission remain a Phase 2 human decision.

## Blocker

Rector 22 supplies resources and potential actions, but does not state which resource/action combinations become published permissions, which base roles receive each permission, the allowed scope set for each, or the atomic capability code. Generating the Cartesian product would grant semantic existence to unapproved permissions.

`PUBLISHED_PERMISSION_ROWS=0`, `UNSOURCED_PERMISSIONS=0`. Human owners must approve the exact registry and base-role grants before `PERMISSION_CATALOG=PASS`.
