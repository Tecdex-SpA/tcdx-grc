FROM golang:1.24.9-bookworm AS build

ARG MINIO_VERSION=RELEASE.2025-10-15T17-29-55Z
ENV CGO_ENABLED=0

RUN GOBIN=/out go install github.com/minio/minio@${MINIO_VERSION}


FROM busybox:1.37.0-musl@sha256:5cec3fc171c87218698e85a52af7087de727372aae264a787b8112901a5b0092

RUN mkdir -p /data \
    && chown 10001:10001 /data

COPY --from=build /out/minio /usr/local/bin/minio
COPY --chmod=0555 deploy/qa/minio/entrypoint.sh /usr/local/bin/tcdx-minio-entrypoint

EXPOSE 9000

ENTRYPOINT ["/usr/local/bin/tcdx-minio-entrypoint"]
CMD ["server", "/data", "--address", ":9000"]
