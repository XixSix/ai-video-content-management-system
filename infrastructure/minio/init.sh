#!/bin/sh

set -eu

mc alias set local "${MINIO_ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"
mc mb --ignore-existing "local/${S3_BUCKET}"

origins_json=""
separator=""
previous_ifs="${IFS}"
IFS=","

for origin in ${MINIO_CORS_ALLOWED_ORIGINS}; do
  origin="$(printf '%s' "${origin}" | tr -d '[:space:]')"

  if [ -z "${origin}" ]; then
    continue
  fi

  case "${origin}" in
    *\"* | *\\*)
      printf '%s\n' "Invalid MINIO_CORS_ALLOWED_ORIGINS value"
      exit 1
      ;;
  esac

  origins_json="${origins_json}${separator}\"${origin}\""
  separator=","
done

IFS="${previous_ifs}"

if [ -z "${origins_json}" ]; then
  printf '%s\n' "MINIO_CORS_ALLOWED_ORIGINS must contain at least one origin"
  exit 1
fi

printf '%s\n' \
  "{\"CORSRules\":[{\"AllowedOrigins\":[${origins_json}],\"AllowedMethods\":[\"GET\",\"PUT\",\"HEAD\"],\"AllowedHeaders\":[\"*\"],\"ExposeHeaders\":[\"ETag\"],\"MaxAgeSeconds\":3600}]}" \
  > /tmp/cors.json

mc cors set "local/${S3_BUCKET}" /tmp/cors.json
mc cors info "local/${S3_BUCKET}"
