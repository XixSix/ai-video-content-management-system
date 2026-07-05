#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="${PERF_OUTPUT_DIR:-$REPO_ROOT/performance-results/backend}"
API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api/v1}"
API_BASE_URL="${API_BASE_URL%/}"
SCENARIO="${SCENARIO:-smoke}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
SUMMARY_FILE="$OUTPUT_DIR/load-summary.md"

mkdir -p "$OUTPUT_DIR"

case "$SCENARIO" in
  smoke)
    DEFAULT_CONNECTIONS=1
    DEFAULT_DURATION=30
    ;;
  normal)
    DEFAULT_CONNECTIONS=10
    DEFAULT_DURATION=60
    ;;
  stress)
    DEFAULT_CONNECTIONS=50
    DEFAULT_DURATION=60
    ;;
  custom)
    DEFAULT_CONNECTIONS=10
    DEFAULT_DURATION=30
    ;;
  *)
    echo "Unsupported SCENARIO '$SCENARIO'. Use smoke, normal, stress, or custom." >&2
    exit 1
    ;;
esac

CONNECTIONS="${CONNECTIONS:-$DEFAULT_CONNECTIONS}"
DURATION="${DURATION:-$DEFAULT_DURATION}"

if [[ "${RESET_SUMMARY:-0}" == "1" || ! -f "$SUMMARY_FILE" ]]; then
  {
    echo "# Backend Load Test Summary"
    echo
    echo "Note: autocannon JSON exposes p97.5 instead of exact p95; the p95 column uses p97.5 as the nearest upper percentile when exact p95 is unavailable."
    echo
    echo "| Run | Scenario | Endpoint | Method | Connections | Duration (s) | Requests/sec | Avg latency (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Max (ms) | Throughput/sec | Total requests | Errors | Error rate | Result file |"
    echo "|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|"
  } > "$SUMMARY_FILE"
fi

ENDPOINT_NAMES=("health")
ENDPOINT_METHODS=("GET")
ENDPOINT_URLS=("$API_BASE_URL/health")

if [[ -n "${AUTH_TOKEN:-}" ]]; then
  ENDPOINT_NAMES+=("auth-me" "jobs")
  ENDPOINT_METHODS+=("GET" "GET")
  ENDPOINT_URLS+=("$API_BASE_URL/auth/me" "$API_BASE_URL/jobs")

  if [[ -n "${WORKSPACE_ID:-}" ]]; then
    ENDPOINT_NAMES+=("media-list")
    ENDPOINT_METHODS+=("GET")
    ENDPOINT_URLS+=("$API_BASE_URL/workspaces/$WORKSPACE_ID/media")
  fi
elif [[ -n "${WORKSPACE_ID:-}" ]]; then
  echo "WORKSPACE_ID was provided without AUTH_TOKEN, skipping authenticated media endpoint." >&2
fi

append_summary_row() {
  local json_file="$1"
  local endpoint_name="$2"
  local method="$3"
  local url="$4"
  local endpoint_path="$url"

  if [[ "$url" == "$API_BASE_URL"* ]]; then
    endpoint_path="${url#"$API_BASE_URL"}"
  fi

  node - "$json_file" "$SUMMARY_FILE" "$TIMESTAMP" "$SCENARIO" "$endpoint_name" "$method" "$endpoint_path" "$CONNECTIONS" "$DURATION" <<'NODE'
const fs = require('node:fs');
const [
  jsonFile,
  summaryFile,
  timestamp,
  scenario,
  endpointName,
  method,
  endpointPath,
  connections,
  duration,
] = process.argv.slice(2);

const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
const numberOrNull = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }
  return Number(value);
};
const format = (value, digits = 2) => {
  const number = numberOrNull(value);
  return number === null ? '-' : number.toFixed(digits);
};
const formatInt = (value) => {
  const number = numberOrNull(value);
  return number === null ? '-' : String(Math.round(number));
};

const totalRequests = numberOrNull(data.requests?.total) ?? numberOrNull(data.requests?.totalCompleted) ?? 0;
const errors = (numberOrNull(data.errors) ?? 0)
  + (numberOrNull(data.timeouts) ?? 0)
  + (numberOrNull(data.non2xx) ?? 0);
const errorRate = totalRequests > 0 ? (errors / totalRequests) * 100 : 0;
const resultFile = jsonFile.replace(process.cwd() + '/', '');
const p95 = data.latency?.p95 ?? data.latency?.p97_5;
const row = [
  timestamp,
  scenario,
  endpointName,
  method,
  connections,
  duration,
  format(data.requests?.average ?? data.requests?.mean),
  format(data.latency?.average ?? data.latency?.mean),
  format(data.latency?.p50),
  format(p95),
  format(data.latency?.p99),
  format(data.latency?.max),
  format(data.throughput?.average ?? data.throughput?.mean),
  formatInt(totalRequests),
  formatInt(errors),
  `${format(errorRate)}%`,
  resultFile,
];

fs.appendFileSync(summaryFile, `| ${row.join(' | ')} |\n`);
NODE
}

run_endpoint() {
  local endpoint_name="$1"
  local method="$2"
  local url="$3"
  local json_file="$OUTPUT_DIR/load-$SCENARIO-$endpoint_name-$TIMESTAMP.json"
  local autocannon_cmd=(
    npx --yes autocannon
    --json
    --connections "$CONNECTIONS"
    --duration "$DURATION"
    --method "$method"
  )

  if [[ -n "${AUTH_TOKEN:-}" ]]; then
    autocannon_cmd+=(--headers "Authorization=Bearer $AUTH_TOKEN")
  fi

  autocannon_cmd+=("$url")

  echo "Running $SCENARIO load test for $method $url"
  "${autocannon_cmd[@]}" > "$json_file"
  append_summary_row "$json_file" "$endpoint_name" "$method" "$url"
  echo "Wrote $json_file"
}

for index in "${!ENDPOINT_NAMES[@]}"; do
  run_endpoint "${ENDPOINT_NAMES[$index]}" "${ENDPOINT_METHODS[$index]}" "${ENDPOINT_URLS[$index]}"
done

echo "Summary: $SUMMARY_FILE"
