#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
LAVALINK_DIR="$ROOT_DIR/lavalink"
LAVALINK_VERSION="4.2.2"
LAVALINK_JAR="$LAVALINK_DIR/Lavalink.jar"
VERSION_FILE="$LAVALINK_DIR/.lavalink-version"

if ! command -v java >/dev/null 2>&1; then
  if command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y java-17-amazon-corretto-headless
  else
    sudo yum install -y java-17-amazon-corretto-headless
  fi
fi

if [[ ! -s "$LAVALINK_JAR" ]] || [[ "$(cat "$VERSION_FILE" 2>/dev/null || true)" != "$LAVALINK_VERSION" ]]; then
  curl --fail --location --retry 3 \
    "https://github.com/lavalink-devs/Lavalink/releases/download/$LAVALINK_VERSION/Lavalink.jar" \
    --output "$LAVALINK_JAR.tmp"
  mv "$LAVALINK_JAR.tmp" "$LAVALINK_JAR"
  printf '%s\n' "$LAVALINK_VERSION" > "$VERSION_FILE"
fi

ENV_FILE="$ENV_FILE" LAVALINK_ENV_FILE="$LAVALINK_DIR/lavalink.env" node <<'NODE'
const crypto = require('crypto');
const fs = require('fs');

const envFile = process.env.ENV_FILE;
const lavalinkEnvFile = process.env.LAVALINK_ENV_FILE;
let source = fs.readFileSync(envFile, 'utf8');

function read(key) {
    const match = source.match(new RegExp(`^(?:export\\s+)?${key}\\s*=\\s*(.*)$`, 'm'));
    return match?.[1]?.trim().replace(/^(['"])(.*)\1$/, '$2') || '';
}

function write(key, value) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^(?:export\\s+)?${key}\\s*=.*$`, 'm');
    source = pattern.test(source) ? source.replace(pattern, line) : `${source.trimEnd()}\n${line}\n`;
}

if (!['127.0.0.1', 'localhost'].includes(read('LAVALINK_HOST'))) {
    const primary = {
        host: read('LAVALINK_HOST'),
        port: read('LAVALINK_PORT') || '443',
        password: read('LAVALINK_PASSWORD'),
        secure: read('LAVALINK_SECURE') || 'true',
    };
    const secondary = {
        host: read('LAVALINK_HOST_2'),
        port: read('LAVALINK_PORT_2') || '443',
        password: read('LAVALINK_PASSWORD_2'),
        secure: read('LAVALINK_SECURE_2') || 'true',
    };

    write('LAVALINK_HOST_2', primary.host);
    write('LAVALINK_PORT_2', primary.port);
    write('LAVALINK_PASSWORD_2', primary.password);
    write('LAVALINK_SECURE_2', primary.secure);

    if (secondary.host && secondary.password) {
        write('LAVALINK_HOST_3', secondary.host);
        write('LAVALINK_PORT_3', secondary.port);
        write('LAVALINK_PASSWORD_3', secondary.password);
        write('LAVALINK_SECURE_3', secondary.secure);
    }

    write('LAVALINK_PASSWORD', crypto.randomBytes(32).toString('hex'));
}

write('LAVALINK_HOST', '127.0.0.1');
write('LAVALINK_PORT', '2333');
write('LAVALINK_SECURE', 'false');
write('LAVALINK_ENABLE_BACKUPS', 'true');

fs.writeFileSync(envFile, source, { mode: 0o600 });
fs.chmodSync(envFile, 0o600);
fs.writeFileSync(lavalinkEnvFile, `LAVALINK_PASSWORD=${read('LAVALINK_PASSWORD')}\n`, { mode: 0o600 });
fs.chmodSync(lavalinkEnvFile, 0o600);
NODE

sudo cp "$LAVALINK_DIR/nishanka-lavalink.service" /etc/systemd/system/nishanka-lavalink.service
sudo systemctl daemon-reload
sudo systemctl enable nishanka-lavalink.service >/dev/null
sudo systemctl restart nishanka-lavalink.service

LAVALINK_PASSWORD="$(sed -n 's/^LAVALINK_PASSWORD=//p' "$LAVALINK_DIR/lavalink.env" | head -n 1)"

LAVALINK_READY=false
for _ in $(seq 1 30); do
  if curl --silent --fail --header "Authorization: $LAVALINK_PASSWORD" \
    "http://127.0.0.1:2333/v4/info" >/dev/null; then
    LAVALINK_READY=true
    break
  fi
  sleep 2
done

if [[ "$LAVALINK_READY" != "true" ]]; then
  sudo journalctl -u nishanka-lavalink.service --no-pager -n 100
  exit 1
fi

MUSIC_NODE=""
if node "$ROOT_DIR/scripts/test-lavalink-playback.js" _3; then
  MUSIC_NODE="node-3"
elif node "$ROOT_DIR/scripts/test-lavalink-playback.js" _2; then
  MUSIC_NODE="node-2"
else
  echo "No configured Lavalink node passed the YouTube playback probe" >&2
  exit 1
fi

ENV_FILE="$ENV_FILE" MUSIC_NODE="$MUSIC_NODE" node <<'NODE'
const fs = require('fs');
const envFile = process.env.ENV_FILE;
let source = fs.readFileSync(envFile, 'utf8');
const line = `LAVALINK_MUSIC_NODE=${process.env.MUSIC_NODE}`;
const pattern = /^(?:export\s+)?LAVALINK_MUSIC_NODE\s*=.*$/m;
source = pattern.test(source) ? source.replace(pattern, line) : `${source.trimEnd()}\n${line}\n`;
fs.writeFileSync(envFile, source, { mode: 0o600 });
NODE

echo "Local Lavalink $LAVALINK_VERSION is ready; music playback selected $MUSIC_NODE"

