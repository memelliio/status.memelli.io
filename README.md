# status.memelli.io

Public incident / status page for memelli.io. Polls the self-heal autonomous loop on api.memelli.io every 30s.

## Deploy

Railway service. Required env:

- `PORT` - default 8080
- `SELF_HEAL_STATUS_URL` - default `https://api.memelli.io/api/admin/self-heal/status`
