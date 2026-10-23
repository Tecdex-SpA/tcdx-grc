# P1/P2/T1 — sucesor local autorizado

Fuente: AUTHORIZATION.json de esta carpeta. Baseline v1.12 e historia intactas.
Rectores45/46/47/49 autorizan la evolución trazable instruida, sin segunda firma.
La publicación local de este paquete requiere manifiestos/recibos exactos.

P1 sucede exclusivamente la clasificación de roles de rector42§3 para las
operaciones globales normativas de rector41§6: Regulatory Content Steward,
Compliance Manager, Quality Manager, CISO/Security Manager, AI Governance Manager,
Privacy Manager, Legal Reviewer y GRC Manager pueden actuar por asignación
PlatformRoleAssignment efectiva y permisos expresamente publicados. Son las mismas
definiciones canónicas ya existentes; no se crean roles ni autoridades IAM.
No obtienen administración Platform ni acceso tenant. Platform Admin administra
asignaciones por el contrato IAM existente, sin heredar las funciones de contenido.

Las validaciones de fuente, edición y paquete se conservan en una relación
soporte tipada de RegulatoryPackVersion, append-only, con bindings exactos a
manifiestos, fuente, hash de la población, actor/asignación/rol y AuditEvent.
Cada sucesión invalida CAS; nunca convierte approved_by singular en varias
coaprobaciones. El autor/importador no puede ser el único aprobador. Las tres
poblaciones se verifican separadamente. No nace un motor de aprobaciones genérico.

P2 fija para CL_LEY_21663 Compliance Manager, CISO/Security Manager y Legal Reviewer,
con publicación por GRC Manager e importación por Regulatory Content Steward.
Las otras cinco combinaciones de rector41 permanecen. Una misma persona no se
presenta como dos actores; la acumulación de roles no elimina la SoD obligatoria.

T1 mantiene emisión externa de Gerencia e incorpora después Document/DocumentVersion
tenant por custodia canónica. Subscription conserva una FK opcional compuesta a
la versión exacta del mismo tenant. El vínculo tiene comando/lectura mínima
Platform acotados; no permite leer el PDF. Documento no es Evidence aprobada,
alta, contrato ni licencia por existir. El documento externo conserva su emisor.

La unicidad de DocumentVersion corresponde a Document+version, conforme rector23
y30 (Document1:NDocumentVersion), no a version_number global. La reconciliación
física elimina exclusivamente esa colisión falsa entre documentos distintos,
conservando IDs/versiones/historia y rechazando duplicados dentro de cada Document.

H04 interno sigue su amendment separado20261023. Ninguna decisión PO crea derechos
externos ni autoriza distribución. Publicación normativa oficial conserva fuente,
edición, cobertura, coaprobaciones y derechos verificables; no se reemplazan por
flags del cliente. El contrato HTTP único y la transacción se detallan en el
amendment ejecutable. Nuevas migraciones se ensayan sólo localmente; las36
predecesoras y la adopción QA permanecen intactas. Sin merge/deploy/QA DML,
contenido auténtico, acciones humanas, ejecución2/3 o STEP6A5/6A6.
