FROM quay.io/keycloak/keycloak:26.7.5@sha256:37dbaf6f0722c9ec246335f36e1ef8b2e6cb960f7c27e0d8c615121a3d475a85

# Login presentation only. Realm configuration, keys, secrets and user state stay outside this image.
COPY --chown=keycloak:keycloak theme/tcdx-grc /opt/keycloak/themes/tcdx-grc
