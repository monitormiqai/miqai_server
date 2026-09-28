# MIQAI SERVER V1 --- TECHNICAL FREEZE / INTEGRATION CHECKPOINT

**Document:** MIQAI_SERVER_V1_TECHNICAL_FREEZE_2026-09-23.md\
**Date:** 2026-09-23\
**Status:** FROZEN --- validated integration checkpoint\
**Scope:** MIQAI Server V1 real HTTP → PostgreSQL → CORE → Public
Response flow

------------------------------------------------------------------------

## 1. Purpose

This document records, exactly as validated on 23/09/2026, how MIQAI
Server V1 is currently operating.

It is intended as a technical reference for future maintenance, audit,
troubleshooting, onboarding, and continuation of development.

This checkpoint must be treated as a **known-good baseline**.

The objective is to preserve the implementation and evidence that were
validated, avoiding unnecessary changes to a functioning path.

------------------------------------------------------------------------

## 2. Frozen Architecture

The validated architecture is:

``` text
ESP32
  │
  │ HTTP telemetry JSON
  ▼
MIQAI Server V1
  │
  ├── Authentication
  ├── Device resolution
  ├── Environment/context resolution
  ├── Telemetry validation
  ├── Reading persistence
  │
  ▼
MIQAI CORE
  │
  ├── Environmental validation
  ├── Metrics
  ├── Diagnosis
  ├── Evidence
  ├── Hypotheses
  ├── Mitigation
  ├── QAI Score
  └── Public Response
  │
  ▼
PostgreSQL
  ├── reading
  └── core_result
  │
  ▼
SaaS / Dashboard
```

### Responsibility boundaries

  --------------------------------------------------------------------------------
  Component                           Responsibility
  ----------------------------------- --------------------------------------------
  ESP32                               Measure environmental parameters and send
                                      telemetry

  MIQAI Server V1                     HTTP gateway, authentication, context
                                      resolution, persistence, CORE orchestration

  MIQAI CORE                          Sole source of environmental intelligence

  PostgreSQL                          Persistence

  SaaS                                Tenant/device/environment/user/operational
                                      management

  Dashboard                           Presentation of CORE Public Response; no
                                      local intelligence
  --------------------------------------------------------------------------------

The Server does not recreate CORE intelligence locally.

The Dashboard must not calculate, interpret, infer, or create
environmental intelligence.

------------------------------------------------------------------------

# 3. Frozen Contracts

The Server V1 workspace contains the following contracts:

``` text
docs/contracts/
├── MIQAI_ESP32_TELEMETRY_V1_1_CONTRACT.md
├── MIQAI_SERVER_INTEGRATION_V1_CONTRACT.md
├── MIQAI_CORE_INPUT_V1_CONTRACT.md
├── MIQAI_DB_POSTGRESQL_V1_CONTRACT.md
├── MIQAI_CORE_PUBLIC_RESPONSE_V1_CONTRACT.md
└── MIQAI_SERVER_V1_IMPLEMENTATION_SPEC.md
```

These contracts define the boundaries between the device, Server, CORE,
PostgreSQL and upper SaaS/Dashboard layers.

The PostgreSQL V1 contract is frozen. Structural database changes
require a methodological/technical decision followed by a
contract/migration/test/audit process.

------------------------------------------------------------------------

# 4. MIQAI Server V1 Workspace

Current independent workspace:

``` text
C:\Users\Giovane\Desktop\MONITOR_MIQAI\monitor\miqai_server_v1
```

The legacy Server remains separate and must not be modified as part of
this V1 implementation.

------------------------------------------------------------------------

# 5. Server V1 Main Flow

The real validated request used:

``` text
POST /api/v1/telemetria
```

with:

``` http
Content-Type: application/json
X-API-Key: <MVP API key>
```

The validated MVP authentication configuration was:

``` powershell
$env:MIQAI_AUTH_MODE = 'mvp'
$env:MIQAI_MVP_API_KEY = '<MVP_API_KEY>'
$env:MIQAI_MVP_DEVICE_ID = '11'
```

The API key is an authentication credential.

It is not environmental telemetry and is not sent to CORE.

------------------------------------------------------------------------

# 6. Real Test Payload

The final successful integration test used:

``` json
{
  "deviceId": 11,
  "firmwareVersion": "MIQAI-EDGE-MVP-1.0",
  "measuredAt": "2026-09-23T11:20:00.000Z",
  "temperature": 29,
  "humidity": 70,
  "co2": 1400,
  "pm1_0": 5,
  "pm25": 6,
  "pm4_0": 8,
  "pm10": 12,
  "vocIndex": 90,
  "noxIndex": 1
}
```

The HTTP result was:

``` text
status
------
accepted
```

The request was therefore accepted by the real Server V1 endpoint.

------------------------------------------------------------------------

# 7. Important Payload Detail

An earlier test intentionally exposed a contract mismatch.

The payload initially used:

``` json
"firmware": "MIQAI-EDGE-MVP-1.0"
```

The Server validation returned:

``` json
{
  "error": "invalid_payload",
  "details": [
    {
      "field": "firmwareVersion",
      "message": "required"
    }
  ]
}
```

The test payload was then corrected to:

``` json
"firmwareVersion": "MIQAI-EDGE-MVP-1.0"
```

No Server code was changed for this correction.

This is important for future manual tests: use `firmwareVersion`, not
`firmware`.

------------------------------------------------------------------------

# 8. Authentication and Context Resolution

For the validated MVP path:

1.  Server receives `X-API-Key`.
2.  Authentication boundary validates the configured MVP credential.
3.  The authenticated logical device is resolved as device `11`.
4.  The Server loads the device record.
5.  The Server verifies the device has an `environment_id`.
6.  The Server loads the environment.
7.  The environment supplies the authorized domain.
8.  The domain is sent to CORE.

The device does not choose its domain.

The Server does not trust a domain supplied by the device.

For the successful test, the resolved CORE domain was:

``` text
corporate
```

------------------------------------------------------------------------

# 9. Reading Persistence

After context resolution, the Server maps telemetry to the PostgreSQL
`reading` model and persists it.

The successful real test created:

``` text
reading.id = 5
```

The persisted record was:

``` text
device_id         = d8c9b96b-184b-45fb-b647-f7e83b16881e
measured_at       = 2026-09-23 11:20:00+00
firmware_version  = MIQAI-EDGE-MVP-1.0
temperature       = 29.00
humidity          = 70.00
co2               = 1400.00
pm1_0             = 5.000
pm25              = 6.000
pm4_0             = 8.000
pm10              = 12.000
voc_index         = 90.00
nox_index         = 1.00
```

The database also generated:

``` text
received_at
created_at
```

according to the database/application persistence behavior.

------------------------------------------------------------------------

# 10. Mapping From Reading to CORE

After the `reading` is persisted, Server V1 maps the database reading to
the CORE input.

The CORE input contains environmental measurement fields accepted by
CORE.

Operational/persistence fields are not treated as environmental
intelligence.

The Server supplies the resolved environment/domain separately:

``` javascript
AnalisarQualidadeAmbiental({
  reading: coreReading,
  environment: environment.domain
})
```

For the successful real test:

``` text
environment.domain = "corporate"
```

The Server does not send credentials, tenant identifiers, database
identifiers, or other operational context to CORE as environmental
readings.

------------------------------------------------------------------------

# 11. CORE Integration

The Server uses:

``` text
core-qai
```

and its public API:

``` javascript
AnalisarQualidadeAmbiental({
  reading,
  environment
})
```

The actual CORE package was loaded successfully.

The real execution was also independently tested through the Server
adapter before the HTTP integration test.

The raw CORE response contains:

``` text
metadata
domain
validation
metrics
diagnosis
evidence
hypotheses
mitigation
environmentalScenario
relationships
impacts
references
```

------------------------------------------------------------------------

# 12. Critical Public Response Rule

The raw CORE response is **not** the object persisted into
`core_result.public_response`.

The Server performs:

``` javascript
const publicResponse = adaptPublicResponse(coreResponse);
```

The persisted object is the **CORE Public Response**.

Its public structure is:

``` text
version
timestamp
status
environment
current
scenario
relationship
impacts
action
followUp
evidence
references
```

This distinction is critical.

Future changes must not accidentally persist the raw CORE response when
the database contract requires the Public Response.

------------------------------------------------------------------------

# 13. Real CORE Result

For the successful real integration test, the CORE generated a Public
Response containing, among other fields:

``` text
environment:
  type = corporate
  name = Corporate

scenario:
  id = warm_humid
  title = Ambiente quente e úmido

relationship:
  id = warm_humid_high_co2
  title = Temperatura, umidade e CO₂ elevados
```

The response also contained readings for:

``` text
temperature
humidity
co2
pm25
pm10
vocIndex
noxIndex
dewPoint
```

The calculated dew point in this real test was:

``` text
23 °C
```

The Public Response also contained evidence, impacts, actions, follow-up
information and references.

------------------------------------------------------------------------

# 14. QAI Score in the Real Test

The installed CORE returned:

``` text
qaiScore.available = true
qaiScore.value = 0
qaiScore.level = POOR
```

This value is recorded here only as the **actual result of the validated
CORE execution**.

This document does not redefine or modify QAI Score methodology.

Any methodological change to QAI Score must be treated separately from
the Server integration.

------------------------------------------------------------------------

# 15. core_result Persistence

The PostgreSQL `core_result` table requires:

``` text
id
reading_id
tenant_id
environment_id
device_id
domain
public_response
created_at
```

The actual remote PostgreSQL schema was confirmed to have:

``` text
id             uuid        NOT NULL
reading_id     bigint      NOT NULL
tenant_id      uuid        NOT NULL
environment_id uuid        NOT NULL
device_id      uuid        NOT NULL
domain         text        NOT NULL
public_response jsonb      NOT NULL
created_at     timestamptz NOT NULL DEFAULT now()
```

Important:

``` text
core_result.id has no database-side default.
```

Therefore Server V1 generates the identifier.

------------------------------------------------------------------------

# 16. UUID Generation Fix

The final working implementation is in:

``` text
src/repositories/coreResultRepository.js
```

The repository imports:

``` javascript
const { randomUUID } = require('crypto');
```

Before insertion, it creates a copy of the record and generates an ID
when absent:

``` javascript
const toInsert = Object.assign({}, coreResult);

if (!toInsert.id) {
  toInsert.id = randomUUID();
}
```

The repository inserts `toInsert`.

This solution was deliberately chosen because:

-   the PostgreSQL contract is frozen;
-   the database schema is correct;
-   no migration is necessary;
-   CORE must not be modified;
-   no dependency is required;
-   record identity is handled at the persistence boundary.

------------------------------------------------------------------------

# 17. Real core_result Record

The successful integration created:

``` text
core_result.id =
5e2dc164-f93e-487c-96ad-312d9e33fab9

reading_id =
5

tenant_id =
07c8da8d-1dc9-4eb6-aca1-c889528a46d5

environment_id =
d1b972d5-71af-446b-aba4-6d8ec0e0879c

device_id =
d8c9b96b-184b-45fb-b647-f7e83b16881e

domain =
corporate
```

The `public_response` column was populated with the actual CORE Public
Response JSON.

Therefore the following relationship was proven in PostgreSQL:

``` text
reading.id = 5
        │
        └──── core_result.reading_id = 5
```

------------------------------------------------------------------------

# 18. End-to-End Proof

The final real integration test proved:

``` text
HTTP POST
   │
   ▼
MIQAI Server V1
   │
   ├── Authentication              PASS
   ├── Device resolution           PASS
   ├── Environment resolution      PASS
   ├── Payload validation          PASS
   │
   ▼
PostgreSQL: reading               PASS
   │
   ▼
CORE real execution                PASS
   │
   ▼
Public Response adaptation         PASS
   │
   ▼
UUID generation                    PASS
   │
   ▼
PostgreSQL: core_result            PASS
```

This is the primary validation evidence for this checkpoint.

------------------------------------------------------------------------

# 19. Automated Test Suite

After the UUID correction, the complete Node test suite was executed:

``` text
npm.cmd test
```

Result:

``` text
tests       32
pass        32
fail         0
cancelled    0
skipped      0
todo         0
```

Therefore:

``` text
32/32 PASS
0 failures
```

The new repository test passed:

``` text
coreResultRepository generates UUID id when missing and preserves fields
```

The existing CORE failure-resilience test also remained passing:

``` text
ingest preserves reading when CORE errors and does not insert core_result
```

The simulated CORE timeout printed by that test is intentional test
output and is not a suite failure.

------------------------------------------------------------------------

# 20. Files Changed in This Checkpoint

The functional correction changed:

``` text
src/repositories/coreResultRepository.js
```

A new test was added:

``` text
tests/repositories/coreResultRepository.test.js
```

No changes were made to:

``` text
MIQAI CORE
PostgreSQL schema
PostgreSQL migration
ESP32 firmware
Public Response contract
QAI Score methodology
legacy Server
```

------------------------------------------------------------------------

# 21. Database Schema Was Not Changed

This is an explicit architectural decision.

The database already matched the frozen contract.

The error:

``` text
null value in column "id" of relation "core_result"
violates not-null constraint
```

was caused by the application failing to supply `core_result.id`.

The correct correction was therefore made in Server V1.

No:

``` text
ALTER TABLE
new default
new migration
schema modification
```

was performed.

------------------------------------------------------------------------

# 22. Known Non-Blocking Warning

The Server process currently emits:

``` text
[DEP0169] DeprecationWarning:
url.parse() behavior is not standardized and prone to errors
that have security implications.
```

This warning did not prevent the validated integration.

It is not part of the UUID/core_result correction.

It should be treated as a separate technical-debt item and investigated
independently rather than being mixed into this frozen checkpoint.

------------------------------------------------------------------------

# 23. Known Observability Improvement for Future Work

Current `ingestionService.js` has a `try/catch` surrounding the CORE
execution and subsequent `core_result` persistence.

The current log message is:

``` text
CORE invocation failed; reading persisted.
```

Because the same `try/catch` also covers persistence, a future database
insertion failure could be reported using a message that suggests the
CORE itself failed.

This is an **observability improvement**, not a current functional
failure.

Do not change it as part of this frozen checkpoint unless a separate
technical decision is made.

A future improvement can separate:

``` text
CORE execution error
Public Response adaptation error
core_result persistence error
```

into distinct error paths/logs.

------------------------------------------------------------------------

# 24. What Is Proven vs. What Is Not

## Proven in this checkpoint

-   Server V1 starts.
-   HTTP endpoint exists.
-   MVP authentication works.
-   Valid telemetry is accepted.
-   Device is resolved.
-   Environment is resolved.
-   Domain is obtained from the environment.
-   `reading` is persisted.
-   Real CORE package loads.
-   Real CORE execution works.
-   Public Response adaptation works.
-   `core_result.id` is generated as UUID.
-   `core_result` is persisted.
-   `reading_id` correctly references the persisted reading.
-   Public Response is persisted as JSONB.
-   Automated test suite is 32/32 green.

## Not claimed by this checkpoint

This checkpoint does not prove:

-   production authentication/credential lifecycle;
-   production-scale concurrency;
-   production hosting/network reliability;
-   SaaS production implementation;
-   production database migration;
-   MQTT integration;
-   full ESP32 physical-device integration;
-   historical 24-hour compliance calculations;
-   production alerting;
-   final QAI Score methodology beyond the currently installed CORE
    behavior.

Those are separate workstreams.

------------------------------------------------------------------------

# 25. Frozen Baseline

The state represented by this document should be treated as:

``` text
MIQAI SERVER V1
INTEGRATION CHECKPOINT
2026-09-23
FROZEN
```

The baseline is:

``` text
32/32 automated tests PASS

+

real HTTP POST accepted

+

real reading persisted

+

real CORE executed

+

real Public Response generated

+

real core_result persisted

+

UUID generated correctly
```

Future modifications should begin from this baseline and should not
silently alter the responsibilities or contracts documented here.

------------------------------------------------------------------------

# 26. Recommended Git Checkpoint

Before continuing development, create a dedicated Git checkpoint/tag
representing this state.

Suggested tag:

``` text
miqai-server-v1-integration-freeze-2026-09-23
```

Suggested commit message:

``` text
freeze: validate Server V1 real CORE and PostgreSQL integration
```

The exact Git operation should only be performed after verifying the
working tree and reviewing the final diff.

------------------------------------------------------------------------

# 27. Final Status

``` text
MIQAI SERVER V1
────────────────────────────────────────

HTTP integration             PASS
MVP authentication           PASS
Device resolution            PASS
Environment resolution       PASS
Reading persistence          PASS
CORE real execution          PASS
Public Response              PASS
UUID core_result             PASS
core_result persistence      PASS
PostgreSQL relationship      PASS
Automated tests              32/32 PASS

STATUS: FROZEN / VALIDATED
DATE:   2026-09-23
```

This document is the technical reference for the validated MIQAI Server
V1 integration state as of 23/09/2026.

