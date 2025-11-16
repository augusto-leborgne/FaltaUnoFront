#!/bin/sh

# Replace env vars in agent config
envsubst < /etc/agent/config.yaml > /tmp/agent-config.yaml

# Start Grafana Agent in background
/usr/local/bin/grafana-agent --config.file=/tmp/agent-config.yaml &

# Start Next.js
exec node_modules/.bin/next start
