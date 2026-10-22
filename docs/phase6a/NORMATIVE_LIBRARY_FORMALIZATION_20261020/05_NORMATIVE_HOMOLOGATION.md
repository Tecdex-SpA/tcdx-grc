# 05 — Homologación normativa y usos de preparación

## Poblaciones conservadas

| Población | Cantidad | Estado de producto | Naturaleza acreditada por el diagnóstico |
| --- | ---: | --- | --- |
| ISO 9001:2015 | 27 | ACEPTADO_PARA_HOMOLOGACION | Candidatos; no obligaciones verificadas |
| ISO/IEC 27001:2022 | 116 | ACEPTADO_PARA_HOMOLOGACION | 23 propuestas operativas y 93 referencias resumidas de Annex A |
| ISO/IEC 42001:2023 | 45 | ACEPTADO_PARA_HOMOLOGACION | 37 prácticas por áreas y ocho propuestas operativas |
| Ley 21.663 | 10 | ACEPTADO_PARA_HOMOLOGACION; sexto ámbito aprobado | Pendientes de homologación y de publicación contractual del sexto código |
| Ley 21.719 | 13 | ACEPTADO_PARA_HOMOLOGACION | Temas/rangos que requieren cotejo con la ley modificatoria, consolidado y fecha |
| Catálogo maestro | **211** | Conservación íntegra | No son 211 obligaciones verificadas |
| ISO 9001:2026 adicional | **104** | Población preparatoria independiente aprobada | Propuestas; texto oficial final no disponible en los ZIP recibidos |

No se declaran 315 obligaciones. Cada candidato conserva ID, miembro ZIP, hash, edición, naturaleza, razón de homologación y asociaciones 0:N a unidades/requisitos/controles/editoriales. Una falta de equivalencia inmediata no elimina el candidato ni fuerza identidad normativa.

El diagnóstico sellado inventarió 97/103 archivos y acreditó que los 97 comunes son idénticos. Se reutilizan sus inventarios, registro de 211, índice de 104 y seis cruces. evidence/POPULATIONS.json permite recuperar las dos poblaciones sin depender de archivos temporales. Los originales siguen en docs/normative-sources/incoming, sin modificaciones.

## Seis dimensiones independientes

1. **Integridad:** SHA256, CRC, tamaño y manifiesto; no demuestra autenticidad.
2. **Autenticidad/procedencia:** editor, cita, edición/adopción nacional, cadena recibida y cotejo; archivo presente no significa licencia.
3. **Validación semántica:** jerarquía, parent, tablas/anexos, atomización, fuerza, condiciones y citas revisadas.
4. **Derechos de uso:** titular/evidencia, usuario, entorno, propósito y operaciones cubiertas; declarar desconocido lo no acreditado.
5. **Homologación:** relación propuesta/confirmada, esquema e identidades canónicas sin pérdida de historia.
6. **Publicación oficial:** coverage y revisión completas por población, autoridad y derechos del paquete concreto.

Estas dimensiones no se colapsan en un enum genérico validado. Los campos y estados de ejecución deben publicarse mediante el contrato aplicable; aquí son dimensiones documentales. Inventariar un paquete no lo publica.

## D03 — Desarrollo y QA

Se aprueba utilizar los materiales disponibles para preparación y QA dentro de los derechos aplicables. **Esta entrega no habilita runtime ni cambia guards.** El diseño distingue alcance funcional interno y autoridad de las afirmaciones.

- Metadatos, referencias, candidatos, guía propia, navegación, configuración y pruebas internas autorizadas no dependen de que todos los paquetes tengan licencia de distribución comercial.
- Reutilizar NON_AUTHORITATIVE_TEST_PACK, access_mode y validation-access actuales, ampliando formalmente su binding si limita un uso interno funcional necesario. No falsear authorized=true o licensed_file para superar una precondición.
- Un flujo interno puede completarse cuando actor, datos, derechos y contratos lo permitan. Su salida no autoritativa no se presenta como certificación, obligación jurídica validada o distribución oficial. result_status conserva su semántica metodológica; no se convierte en estado de licencia.
- Falta de derecho para compartir texto completo restringe ese acto; se mantienen las funciones independientes con referencias y contenido editorial autorizado. Procesamiento externo tampoco se presume permitido. No se relajan SoD, aislamiento, metodología, antivirus o integridad.
- Publicar acceso por tenant, versión, propósito y cuenta mediante contratos; sin hardcodes de entorno ni producción simulando QA.

El diagnóstico encontró aviso de uso específico TRUSTTECH en NCh 27001 y declaraciones copyright en los PDF ISO; no acreditó licencia Tecdex multiusuario. Las fuentes generales distinguen uso individual, acceso compartido y reproducción: [ISO ayuda](https://www.iso.org/contact-iso.html), [ISO copyright](https://www.iso.org/copyright.html), [INN preguntas frecuentes](https://www.inn.cl/faqs?page=1). Esto justifica comprobar derechos del acto concreto, sin bloquear toda la biblioteca ni exigir otra aprobación jurídica de producto. Esas páginas generales no resuelven licencias individuales o todas las excepciones legales.

Por fuente registrar derecho invocado, evidencia, operación, actor, entorno y destinatario. Sin evidencia no se declara permitido el uso concreto; continúan los usos independientes acreditados. Los gates de publicación permanecen por paquete.

## Reglas de homologación y fuentes

- Framework/FrameworkVersion y NormativeUnit organizan; Requirement es obligación atómica; Control es mecanismo; Knowledge es orientación; Evidence prueba un objeto autorizado.
- Un control auténtico de Annex A se representa como Control/ControlVersion de referencia y se ubica mediante NormativeUnitControlMapping. No se fabrica un Requirement para acomodarlo.
- Las prácticas editoriales Tecdex siguen como guía/control propuesto; semejanza temática no les da carácter oficial.
- Artículos y rangos legales se estructuran y atomizan con condiciones y fechas. La aplicabilidad corresponde al tenant cuando proceda; no es universal. Ley 21.719 y texto consolidado de 19.628 conservan procedencia y vigencias distinguibles.
- ISO 9001:2015 y 2026 mantienen identidades e historia independientes. El diagnóstico previo cotejó el estado editorial 2026 en fuente primaria, pero ello no aporta el PDF final licenciado ausente. Admitirlo después mediante nueva versión, cotejo y mappings; no sobrescribir 2015 ni presentar las 104 propuestas como texto final.
- Las seis correspondencias POTENCIAL permanecen preliminares hasta cotejo de edición, target, dirección, fundamento y revisión. No fabricar confianza ni equivalencia de cumplimiento; target NULL sólo donde no_match esté justificado conforme al contrato.
- Coverage distingue unidades, Requirements y controles auténticos esperados/importados/revisados; no se calcula desde 211+104.

Las seis fuentes se evalúan separadamente en la matriz sellada 10_NORMATIVE_SOURCES_STATUS.csv del diagnóstico, que se incorpora por referencia y hash. Esta formalización no ejecuta una nueva validación jurídica o semántica.

## Importación futura

El importador v1.1 actual es específico de 49 archivos. No ejecutarlo contra estos ZIP. Con autorización posterior y contratos publicados, preparar adaptador tipado, dry-run/diff, identidades, parent/ciclos, FKs, ownership, replay, conflicto y versiones inmutables. Conservar todos los candidatos y la trazabilidad de divisiones o agrupaciones; agrupar propuestas no fusiona entidades publicadas automáticamente.

Importar en QA requiere autorización exacta, datos/actores reales, recuperación y recibos. Publicar oficialmente requiere el gate del paquete correspondiente. La aceptación funcional de la biblioteca es independiente. **No se ejecutaron extracción semántica nueva, cotejo normativo integral, importación, publicación o validación IA.**
