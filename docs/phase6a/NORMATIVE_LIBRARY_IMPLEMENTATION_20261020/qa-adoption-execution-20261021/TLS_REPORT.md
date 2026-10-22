# Certificado PostgreSQL QA — inspección pública sólo lectura

**BLOCKED. No DDL, no autenticación PostgreSQL, no ventana iniciada, no cambio de confianza/configuración.** Instrucción PO sucesora: inspeccionar el certificado público y contrastar identidad sin aceptar automáticamente un autofirmado. Se usó OpenSSL3.6.5, STARTTLS PostgreSQL a192.168.2.40:5432, `-verify_return_error -verify_ip 192.168.2.40 -showcerts`. La verificación permaneció activa y fatal: exit1, certificado autofirmado, verify error18. Se extrajo únicamente el certificado público que el servidor presentó antes del rechazo; el PEM es **evidencia observada no confiable**, no una CA aprobada. No se lo añadió a ningún trust store o NODE_EXTRA_CA_CERTS.

Observado:2026-10-21T23:25:30.685214Z.

| Propiedad | Valor observado |
|---|---|
| Destino |192.168.2.40:5432, negociación PostgreSQL STARTTLS |
| Subject |CN=db-tecdex |
| Issuer |CN=db-tecdex; autofirmado, cadena presentada de un certificado |
| Not before |2026-05-17 20:59:33 UTC |
| Not after |2036-05-14 20:59:33 UTC |
| Vigencia temporal al observar |Dentro del intervalo; esto no acredita confianza |
| SAN |DNS:db-tecdex, sin IP192.168.2.40 |
| Serial |19C96762B6237D8AD7A2A415FA11556376D1EB2C |
| SHA256 del certificado DER |**FB:68:09:DA:13:9E:E3:E5:2C:2F:1F:EA:D7:5B:11:92:7B:04:B8:96:7A:2B:5D:B8:46:9C:B6:70:E3:BB:A3:E6** |
| SHA256 del archivo PEM observado |0a99469321c1117cdf3154a7e5c5e50dd42f719af7b8b1a647fa0bb55179519b; no confundir con huella DER |

## Resultado de verify-full e identidad

1. **IP autorizada192.168.2.40: no válida para este certificado.** `openssl x509 -checkip` devuelve exit1: IP does NOT match certificate. Confiar en la CA/certificado no corregiría la ausencia de SAN IP.
2. **Nombre presentado db-tecdex: coincide únicamente en la comprobación offline del SAN** (`x509 -checkhost`, exit0). No existe referencia administrativa verificada que lo vincule al host QA autorizado. No se resolvió/conectó a ese nombre, cambió DNS/hosts ni lo aceptó como alias autorizado.
3. **Confianza: no acreditada.** El runner canónico con validación CA/system store rechaza DEPTH_ZERO_SELF_SIGNED_CERT, y OpenSSL confirma el rechazo. No se ejecutó una conexión verify-full con un trust anchor observado/autoprobado. El comando libpq previo sslmode=require demuestra transporte cifrado, no este gate de confianza/identidad.

Por tanto, verify-full de la IP canónica **no es posible con el certificado presentado**, y verify-full con el hostname permanece **NOT_VERIFIED/BLOCKED** hasta contar con confianza y vinculación administrativa independiente. Ninguna de estas limitaciones habilita a modificar el servidor o relajar validación.

## Contraste mínimo por canal independiente — propuesta, no ejecutada

Un administrador debe usar una **consola/sesión ya autenticada por un canal independiente de esta conexión TLS** al servidor QA192.168.2.40/cluster16/main. No basta volver a descargar el mismo certificado por la conexión observada.

En esa consola, sólo lectura, identificar el certificado público configurado:

```sh
sudo -u postgres psql --cluster 16/main -XAt --dbname=tcdx-grc --command='SHOW ssl_cert_file;'
sudo -u postgres psql --cluster 16/main -XAt --dbname=tcdx-grc --command='SHOW data_directory;'
```

Resolver la ruta pública devuelta; si ssl_cert_file es relativa, tomarla respecto del data_directory devuelto. No consultar/exportar ssl_key_file, clave privada, passphrases o credenciales. Sobre **esa ruta pública verificada**, ejecutar:

```sh
openssl x509 -in /ruta/publica/verificada/del/certificado.pem -noout -sha256 -fingerprint -subject -issuer -dates -ext subjectAltName
```

Contrastar la huella DER completa FB:68:09:DA:13:9E:E3:E5:2C:2F:1F:EA:D7:5B:11:92:7B:04:B8:96:7A:2B:5D:B8:46:9C:B6:70:E3:BB:A3:E6 y registrar host/cluster, hora y resultado. Si no coincide, mantener STOP: no se presume que el archivo y el certificado activo sean el mismo. Facilitar la constancia y **sólo** certificado/CA públicos mediante una referencia segura aprobada; confirmar expresamente cuál será el ancla de confianza para este QA. La huella descargada por este agente no constituye esa constancia.

Además, el administrador/PO debe resolver la identidad:

- Si db-tecdex es un nombre autorizado del mismo QA, proporcionar la vinculación administrativa y la ruta de conexión/resolución ya existente que mantenga el destino192.168.2.40 y permita validar ese SAN. No crear DNS/hosts/fallback ni asumir equivalencia por el CN.
- Si se mantiene exclusivamente la IP como identidad de conexión, el certificado actual no sirve para verify-full. Hará falta una orden separada, fuera de esta migración, para preparar/aprobar el certificado con SAN IP adecuado y su confianza, y para cualquier eventual instalación/recarga. Este expediente no autoriza esas modificaciones.

**Información concreta pendiente:** constancia independiente de la huella y confianza pública aprobada, más identidad autorizada utilizable por el runner (hostname vinculado y válido, o certificado válido para la IP). La autorización DDL ya recibida no se vuelve a pedir. Sólo después de resolver TLS se repetirán los gates previos y se podrá abrir la ventana condicionada; ahora NO_GO.
