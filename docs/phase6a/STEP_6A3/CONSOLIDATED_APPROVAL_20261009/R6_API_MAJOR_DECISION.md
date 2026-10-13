# API major prerequisite for IANA publication R6

D3=A and all D1–D5 choices are already approved. This is a distinct prerequisite, not another D3 confirmation. Rector25 §1 says «Breaking change requiere nueva major version». Current tuple/parsers are closed. Old parser/schema reject the added field; new parser/schema reject missing field. Paired rollout prevents mismatched deployment, but does not satisfy that higher major-version rule.

The local candidate and its attributable patch passed869tests; publication is BLOCKED_API_MAJOR, with no new effective contract metadata. D1/D2/D4/D5 work continues independently. No v1.8 alteration or v2 route is inferred.

## Two routes to prepare an exact later approval

### Option A

Solicito derivar y presentar para aprobación posterior el delta exacto de currentPrincipalAuthorizationRead en /api/v2/auth/me/authorization y sus consumidores, conservando íntegro el texto IANA ya aprobado. No autorizo publicación automática de hashes futuros, convivencia legacy ni despliegue; debe decidirse formalmente el retiro de la proyección anterior y su compatibilidad antes de ejecución.

UTF8+newline SHA256 188f09c23936afe871ad562ce20d7e859914a83d66766cd708a5c330fcec5ec5

### Option B

Solicito preparar una enmienda rectora sucesora, exclusivamente para el campo default_timezone de CurrentPrincipalTenantPermissions identificado por SHA-256 6205faaafa3cb0cbd4d0cf34cd9c8343ccca64392e638a833e10fa7db8c73375, que permita su cambio coordinado de DTO cerrado bajo la ruta v1 actual sin nueva major. No activo la enmienda ni modifico v1.8; los bytes de la nueva enmienda y su manifest deberán ser aprobados posteriormente antes de publicación local. Toda otra regla de rector25 se conserva.

UTF8+newline SHA256 39b726aa1b3593693c670e950841c229496fb99405a37712ccf51e3af56c1309

Neither option is approved by D1–D5. Both authorize preparation only; an exact new contract or rector amendment needs its later presented hashes. C preserves current blockage without either selection. Owner Architecture/Backend/Security/PO may act with accumulated internal functions under49; no independent internal reviewer is imposed.

Other residual inputs are grouped in R6_RESIDUAL_INPUTS.md: exact methodology rules/relationship, RLS context proof/roles and operational identities/backup/window. CT04 D2=C safe hold remains effective.

## Owner disposition — 2026-10-13

Option A selected explicitly in the conversation, by the option hash above. Receipt: R6_API_MAJOR_PREPARATION_RECEIPT.json. Preparation of the v2 exact draft is authorized; later approval of its presented bytes and retirement/compatibility remains required before effective publication. The earlier candidate and its 869 PASS remain historical local candidate evidence.
