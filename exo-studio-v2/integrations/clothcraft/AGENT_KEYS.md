# ClothCraft local agent keys

The agent API listens on the existing loopback HTTP bridge. Only explicitly trusted app UI origins may create, list, or revoke keys at `GET /agent/v1/keys`, `POST /agent/v1/keys`, and `DELETE /agent/v1/keys/:id`. The key creation response contains the secret once; listings include metadata only. The JSON store remains outside the app bundle with mode `0600`, using `EXO_AGENT_KEY_STORE_PATH` or the API constructor's `keyStorePath` option.

To create a key from the trusted Settings page, POST `{"name":"Design assistant","scopes":["read","edit"],"expiresInDays":30}`. `expiresAt` is also supported as a future ISO timestamp. Scopes are `read` for inspection/status, `edit` for save, undo, redo and line specifications, and `simulate` for pause and stepping. Every key must include `read` so an agent can inspect the revision before issuing mutations. Each action in a batch is individually checked against the key's scopes. Expired and revoked keys are rejected. Both `Authorization: Bearer <key>` and `X-ClothCraft-Token: <key>` are accepted. The MCP bridge reads `EXO_CLOTHCRAFT_AGENT_KEY`, with legacy `EXO_AGENT_API_TOKEN` supported for existing deployments.

For script requests without an Origin header, agent keys are required. A trusted UI Origin can continue to operate without an agent key, but any supplied key's scopes are enforced. No-Origin requests cannot manage keys. Never commit the raw secret to the project or paste it into logs.

Run `node --test integrations/clothcraft/agent-keys.test.mjs` for lifecycle, scope, batch and Origin regression coverage.
