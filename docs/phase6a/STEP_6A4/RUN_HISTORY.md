# STEP6A4 — diagnóstico y correcciones de verificación

Este registro conserva los motivos de iteraciones fallidas. Los recibos finales JSON y logs del expediente `evidence/local-20261020/` determinan el resultado actual. Ninguna iteración fallida se usa para acreditar PASS.

| Hallazgo durante verificación | Causa / corrección | Naturaleza |
| --- | --- | --- |
| Chromium no arrancaba dentro del sandbox | Rechazo macOS MachPort `Permission denied`; ejecución local autorizada fuera del sandbox. | Restricción de ejecución, sin cambio de producto. |
| Locator de creación no encontraba el botón | El fixture buscaba “Crear”; el componente publicado usa “Crear registro”. Locator corregido. | Prueba. |
| Dos casos finales perdían el servidor de fixtures | Teardown de una ejecución anterior tras reutilización del servidor; ejecuciones finales independientes. | Infraestructura local de prueba, sin modificación de infraestructura del producto. |
| Fixture de Evidence perdía selección de política al cambiar de contexto | Cambio evidencia/upload invalida correctamente el selector previo; prueba vuelve a elegir la opción del contexto nuevo. | Prueba; comportamiento de seguridad preservado. |
| Contexto de aplicabilidad ausente antes de transferir | La nueva validación excluía anticipadamente el miembro exclusivo del upload; se conserva separado del body EvidenceCreate. | Defecto de implementación corregido, prueba focalizada PASS. |
| Par tenant Control/ControlVersion de SoA incompleto | Dos callbacks de una interacción podían sobrescribirse con un snapshot anterior del editor. Buffer efímero actualizado sin perder la FK del padre. | Defecto del editor corregido. |
| Selector ControlVersion de EvidenceLink desaparecía al elegir control | Limpieza de versión vacía eliminaba la selección de familia del destino; la FK tipada vacía permanece sólo durante edición. | Defecto del editor corregido. |
| Mensajes de alternativas `oneOf` parecían exigir todos los targets | Se conserva el error de selección única y se omiten los `required` de ramas alternativas; schemas intactos. | Corrección de mensajes. |
| Errores de campo permanecían visibles después de editar | Se limpian errores obsoletos al modificar el formulario; siguiente envío revalida el request completo. | Corrección de interacción. |
| Confirmación cero-input no explicitaba destino | El destino se proyecta del propósito contractual de cada formulario, sin enviar lifecycle en payload. | Corrección contractual de presentación. |

Las pruebas de componentes emplean fixtures expresamente simulados, con datos de prueba y un sustituto del pipeline de transferencia. No son identidades, permisos, tenants, documentos ni datos reales, y no acreditan backend/QA. No se modificaron contratos o baseline para conseguir un PASS.
