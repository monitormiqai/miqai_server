# MIQAI_SERVER_V1_IMPLEMENTATION_SPEC

1. Objective

This document captures the frozen technical decisions and the pre-implementation specification for MIQAI Server V1. No code is implemented in this step. This file summarizes architecture, ingestion flow, persistence, CORE integration and operational decisions required before production deployment.

2. Architecture

Reference architecture:

ESP32 → POST /api/v1/telemetria (X-API-Key header + JSON V1.1) → MIQAI Server V1
  - Server responsibilities: authentication, device resolution, authorized context resolution, validation, persistence (reading), prepare CORE input, call CORE public API, persist core_result, return result.
  - CORE responsibilities: normalization, domain resolution, intelligence (QAI Score, diagnosis, evidence, etc.), Public Response.
  - SaaS/DB responsibilities: operational persistence, alerts, history, Dashboard.

3. Ingestion flow (official)

1. ESP32 POST /api/v1/telemetria
2. Receive request (record server reception time)
3. Parse and validate telemetry structure against Telemetry V1.1
4. Authenticate `X-API-Key`
5. Resolve `device` from credential and verify credential↔device association
6. Resolve authorized `environment` and `tenant` from registration
7. Persist `reading` into DB (see Reading mapping)
8. Prepare CORE input (per `MIQAI_CORE_INPUT_V1_CONTRACT.md`) — build `reading` object and `environment` string
9. Call CORE public API: `AnalisarQualidadeAmbiental({ reading, environment })`
10. If CORE responds, persist `core_result` (public_response JSONB + relational metadata)
11. Return appropriate response to caller (passthrough Public Response when available)

4. Endpoint (frozen)

POST /api/v1/telemetria
Headers:
- `Content-Type: application/json`
- `X-API-Key: <api_key>`

Notes: API key is NOT part of JSON. Endpoint is now fixed for V1 per frozen decision.

5. Validation rules

- Required fields on incoming telemetry: `deviceId`, `firmwareVersion`, `measuredAt` (Telemetry V1.1). Validate types and presence.
- Sensor fields are nullable; accept `null` per Telemetry V1.1 and DB V1.
- Do not accept `apiKey` in body; reject if present as out-of-contract field.

6. Authentication (frozen)

Flow:
- Read `X-API-Key`
- Resolve `device_credential` (look up `key_hash` storage)
- Resolve `device` associated with credential
- If credential invalid/revoked or credential↔device mismatch, reject (auth failure)

Rules:
- `X-API-Key` is credential only; never persist it in `reading`; never forward to CORE.
- `key_hash` stored in `device_credential` table (DB responsibility).

7. Device identity mapping (frozen)

- Telemetry `deviceId` (integer) → lookup `device.device_id` (integer unique) → obtain `device.id` (uuid) → persist `reading.device_id = device.id`. This mapping must be enforced.

8. Reading persistence (frozen)

- Persist `reading` BEFORE calling CORE.
- `reading` must include:
  - `device_id` (uuid FK to `device.id`)
  - `measured_at` (timestamptz) ← telemetry `measuredAt` (preserve)
  - `received_at` (timestamptz) ← server reception time (generate)
  - `firmware_version` ← telemetry `firmwareVersion`
  - sensor columns as specified in DB V1 (numeric types, nullable)
  - `created_at` defaulted by DB
- Do NOT persist `X-API-Key` in `reading`.
- No rollback of `reading` on CORE failure in V1.

9. CORE integration (frozen)

- Use only public API: `AnalisarQualidadeAmbiental({ reading, environment })` as defined in `MIQAI_CORE_INPUT_V1_CONTRACT.md`.
- Build the `reading` object for CORE using only the fields accepted by CORE input contract (example: deviceId/device_id, temperature, humidity, co2, vocIndex, noxIndex, pm1_0, pm25, pm4_0, pm10, nc0_5, nc1_0, nc2_5, nc4_0, nc10_0, typicalSize, signalStrength or `signal` alias).
- Do NOT send operational fields to CORE: `firmwareVersion`, `measuredAt`, `received_at` are persisted but not part of normalized CORE `reading` (CORE ignores them per contract).
- `environment` must be an authorized string resolved by the Server. CORE resolves Domain internally. Do NOT send `domain`.
- Do NOT send `tenantId`, `tenant_id`, `environmentId`, `environment_id`, `apiKey`, `key_hash` or `device_credential` to CORE.
- Do NOT import or call CORE internal modules; call only public function.

### Mapeamento PostgreSQL → CORE

O fluxo e mapeamento entre o registro relacional no PostgreSQL e o parâmetro `environment` enviado ao CORE devem obedecer estritamente às regras abaixo:

1. O Server autentica a credencial e resolve o `device` a partir de `X-API-Key`.
2. O `device` possui o campo `environment_id` (referência relacional para `environment.id`).
3. O Server/SaaS resolve o registro correspondente em PostgreSQL:

  ```text
  device.environment_id
     ↓
  environment.id (registro PostgreSQL)
  ```

4. O Server deve obter do registro `environment` o campo `environment.domain` (campo `domain` do registro `environment`).
5. O valor de `environment.domain` é o valor exato que será enviado ao CORE no parâmetro `environment`.

  Exemplo (PostgreSQL):

  ```text
  environment.id = <UUID>
  environment.name = "Sala de Reunião 01"
  environment.domain = "corporate"
  ```

  Chamada ao CORE:

  ```js
  AnalisarQualidadeAmbiental({
     reading,
     environment: "corporate"
  })
  ```

6. NÃO enviar `environment.id` para o CORE como `environment`.
7. NÃO enviar `environment.name` para o CORE como `environment`.
8. NÃO enviar `tenant_id` para o CORE.
9. NÃO enviar `environment_id` para o CORE.
10. NÃO enviar `domain` como propriedade separada para o CORE.

11. O CORE recebe somente o parâmetro público:

   ```js
   environment: "<valor de environment.domain>"
   ```

12. O Server NÃO deve inferir o Domain a partir de `environment.name`.
13. O Server NÃO deve inventar, traduzir ou converter valores de `environment.domain`.
14. O valor enviado ao CORE deve ser um dos Domains V1 válidos: `corporate`, `healthcare`, `education`, `residential`, `datacenter`.
15. Se o `device` estiver sem `environment_id`, o Server NÃO deve escolher um ambiente padrão para processamento de produção.
16. Se o `environment_id` existir, mas o registro não puder ser resolvido, o Server deve tratar isso como erro de contexto/autorização e NÃO chamar o CORE.
17. Se `environment.domain` não for um valor válido do contrato V1, o Server deve rejeitar o processamento e NÃO chamar o CORE.
18. O Server não deve depender do fallback interno do CORE ("corporate") como estratégia do Server. O contexto válido deve ser resolvido e validado pelo Server antes da chamada.

Fluxo conceitual resumido:

```
X-API-Key
  ↓
device_credential
  ↓
device
  ↓
device.environment_id
  ↓
environment (PostgreSQL record)
  ├── tenant_id
  ├── name
  └── domain
       ↓
  CORE environment
       ↓
AnalisarQualidadeAmbiental({
   reading,
   environment: environment.domain
})
```

IMPORTANTE — separação conceitual:

PostgreSQL:
- `environment.id` = identidade relacional
- `environment.name` = identificação operacional do ambiente
- `environment.domain` = contexto de Domain utilizado na integração com o CORE

CORE:
- `environment` = string de contexto recebida pela API pública
- `domain` = resolvido internamente pelo CORE a partir do `environment`

10. CORE response handling (frozen)

- Treat CORE `Public Response` as authoritative.
- If CORE returns a valid Public Response, persist it into `core_result.public_response` as JSONB and persist required relational metadata: `reading_id`, `tenant_id`, `environment_id`, `device_id`, `domain` per DB contract.
- Do NOT decompose intelligence into relational columns in V1 (no separate columns for `qaiScore`, `evidence`, `diagnosis`, `hypotheses`, `mitigation`, `scenario`, etc.).

11. CORE failure policy (frozen constraints)

- If CORE is unavailable or returns an error:
  - `reading` remains persisted.
  - `core_result` is NOT created.
  - Do NOT invent or fabricate Public Response or intelligence.
  - Do NOT implement retry, queueing, or external message brokers in V1.
  - No rollback of `reading`.
- Treat complex retry/queue/compensation as future enhancement (MELHORIA FUTURA).

12. Alerts (frozen constraint)

- Server V1 must NOT generate environmental alerts or intelligence.
- The `alert` entity is operational responsibility of the SaaS; Server V1 must not implement intelligence-derived alert rules.
- If operational alerts are required, responsibility and rules must be decided and implemented in SaaS layer (DECISÃO DE ARQUITETURA OPERACIONAL).

13. Idempotency and deduplication (frozen)

- V1 explicitly does NOT implement `messageId`, idempotency keys or deduplication.
- Do NOT add fields or logic for idempotency in this version.

14. Missing data handling (frozen)

- Do not interpolate, backfill, or synthesize readings for missing intervals.
- CORE receives only actual readings submitted by devices.

15. Timestamp semantics (frozen)

- `measuredAt` → persisted to `reading.measured_at` (preserve value).
- Server generates `received_at` at ingestion and persists to `reading.received_at`.
- `measured_at > received_at` is allowed (device offline scenario) and not auto-error.

16. Error mapping (proposal, decision pending)

Proposed mapping for review (DECISÃO DE IMPLEMENTAÇÃO):
- 400 → Bad Request (invalid payload)
- 401 → Unauthorized (missing/invalid `X-API-Key`)
- 403 → Forbidden (credential valid but access not authorized)
- 404 → Not Found (device/context not found)
- 422 → Unprocessable Entity (semantic telemetry validation failed)
- 500 → Internal Server Error
- 502/503 → CORE unavailable / integration error

Do not hardcode these codes into contracts; treat as implementation proposal to be reviewed.

17. Proposed code architecture (conceptual only)

Folders (proposal; DO NOT CREATE):
- `routes/` — HTTP routes
- `controllers/` — route handlers
- `middleware/` — auth, validation
- `services/` — ingestion, auth, context, core adapter, persistence
- `repositories/` — DB access
- `mappers/` — telemetry→DB, telemetry→CORE
- `validation/` — telemetry schema validators
- `errors/` — structured errors

18. Responsibilities (separation)

- Controller/Route: receive HTTP and invoke services.
- Authentication: validate `X-API-Key` and resolve credential.
- Context Resolver: resolve `device`, `environment`, `tenant`.
- Telemetry Validator: validate incoming Telemetry V1.1.
- Reading Repository: persist `reading`.
- CORE Adapter: map telemetry to CORE input and call `AnalisarQualidadeAmbiental`.
- Core Result Repository: persist `core_result` (JSONB + relational metadata).
- Server: orchestrates the full flow; MUST NOT produce environmental intelligence.

19. Future tests (to be implemented later)

Categories and required tests (NOT implemented here):
- Authentication: valid/absent/invalid/revoked keys
- Device: existing vs non-existing device, credential mismatch
- Context resolution: environment/tenant resolution and tenant isolation
- Telemetry validation: required fields, nullable sensors, types
- Persistence: reading created, measured_at preserved, received_at generated
- CORE integration: correct input shape, environment, no auth fields sent
- CORE failure: reading persists, no core_result created
- DB integrity: FK, UNIQUE(reading_id), tenant isolation

20. Open implementation decisions (to be resolved before production)

- Finalize error code mapping and response body shapes.
- Logging & observability policy (correlation IDs, whether to persist latency/request_id).
- Operational policy for CORE unavailability (if/when to implement retries/enqueue/reprocess).
- Alert generation policy and ownership (Server vs SaaS).

21. Explicit non-goals (frozen)

- No code changes to CORE.
- No DB schema changes (migrations) beyond DB V1.
- No idempotency mechanism or messageId.
- No queue/broker integration in V1.
- No local intelligence or environmental event creation by Server.

22. Frozen decisions (summary)

- Endpoint: `POST /api/v1/telemetria` with `X-API-Key` header.
- Persist `reading` before CORE call.
- Do not rollback `reading` on CORE failure.
- Do not implement idempotency/dedup in V1.
- Use only CORE public API: `AnalisarQualidadeAmbiental({ reading, environment })`.
- Persist `core_result.public_response` as JSONB and relational metadata per DB contract.
- Server must not send tenancy/auth fields to CORE.

23. Document status

SPECIFICATION READY — NO CODE IMPLEMENTED


----

Revision history:
- v1.0 — specification created (based on final re-audit of contracts)
