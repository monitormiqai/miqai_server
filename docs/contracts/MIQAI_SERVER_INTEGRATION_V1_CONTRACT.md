# MIQAI SERVER — INTEGRATION V1 CONTRACT

**Status:** OFFICIAL / CURRENT  
**Contract:** ESP32 → MIQAI Server → CORE → PostgreSQL / SaaS  
**Version:** Server Integration V1  
**Purpose:** Define the responsibilities, boundaries, processing flow and integration rules of the MIQAI Server.

---

## 1. Purpose

This document defines the official integration contract for the MIQAI Server.

The Server is the orchestration and integration layer between:

- ESP32 telemetry;
- device authentication;
- authorized operational context;
- PostgreSQL persistence;
- MIQAI CORE;
- Public Response;
- SaaS.

The Server does **not** own environmental intelligence.

> **CORE produces intelligence. The Server transports, authenticates, orchestrates and persists.**

The Server must consume the official contracts without silently changing their semantics.

---

## 2. Source of truth

This document must be read together with the following official contracts:

```text
MIQAI_ESP32_TELEMETRY_V1_1_CONTRACT.md
MIQAI_CORE_PUBLIC_RESPONSE_V1_CONTRACT.md
MIQAI_DB_POSTGRESQL_V1_CONTRACT.md
```

Each contract defines a different boundary:

```text
ESP32 Telemetry Contract
    = what the device sends

Server Integration Contract
    = how the Server receives, resolves, orchestrates and persists

CORE Public Response Contract
    = what the CORE returns

PostgreSQL Contract
    = how operational data is persisted
```

These contracts are complementary.

The Server Integration Contract must not redefine the meaning of fields belonging to the other contracts.

---

## 3. Official architectural flow

The official flow is:

```text
ESP32
   │
   │ HTTP + X-API-Key + Telemetry JSON V1.1
   ▼
MIQAI Server
   │
   ├── authenticate device
   ├── resolve authorized context
   ├── persist reading
   ├── call CORE
   ├── receive Public Response
   └── persist core_result
   │
   ▼
PostgreSQL / SaaS
   │
   ▼
SaaS API
   │
   ▼
Dashboard / App
```

The current production architecture keeps MIQAI Server and MIQAI CORE outside the SaaS infrastructure.

The production PostgreSQL database belongs to the SaaS infrastructure.

Supabase may be used as a PostgreSQL-compatible test/development environment during implementation.

---

## 4. Server responsibilities

The MIQAI Server is responsible for:

1. receiving telemetry;
2. authenticating the device credential;
3. validating device identity;
4. resolving authorized context;
5. validating telemetry structure;
6. persisting the received reading;
7. preparing the CORE input;
8. invoking MIQAI CORE;
9. receiving the Public Response;
10. persisting the complete CORE result;
11. returning the appropriate response to the caller;
12. preserving operational traceability.

The Server is an integration/orchestration layer.

---

## 5. Server non-responsibilities

The Server must not:

- calculate QAI Score;
- create environmental diagnosis;
- create regulatory rules;
- reinterpret legislation;
- create evidence;
- create hypotheses;
- create mitigation;
- create environmental scenarios;
- create relationships;
- create impacts;
- reconstruct or reinterpret `score`;
- infer occupancy;
- create parallel environmental intelligence;
- modify CORE results merely to fit persistence;
- recreate the Public Response from database columns.

If an environmental decision is required, the decision belongs to MIQAI CORE and its approved methodology.

---

## 6. Input contract

The Server receives the official ESP32 Telemetry V1.1 request.

### HTTP

```http
POST /telemetry
Content-Type: application/json
X-API-Key: <api_key>
```

The concrete endpoint path may be deployment-specific, but the integration semantics remain unchanged.

### Body

The body must conform to:

```text
MIQAI_ESP32_TELEMETRY_V1_1_CONTRACT.md
```

Example:

```json
{
  "deviceId": 11,
  "firmwareVersion": "1.0.0",
  "measuredAt": "2026-09-21T10:53:00Z",
  "temperature": 24.7,
  "humidity": 51.2,
  "signalStrength": -67,
  "co2": 730,
  "co": 0.4,
  "pm1_0": 1.1,
  "pm25": 2.8,
  "pm4_0": 4.2,
  "pm10": 6.0,
  "nc0_5": 12.4,
  "nc1_0": 18.1,
  "nc2_5": 21.7,
  "nc4_0": 23.5,
  "nc10_0": 24.2,
  "vocIndex": 95,
  "noxIndex": 2,
  "typicalSize": 0.58
}
```

---

## 7. API Key boundary

The API Key is a device authentication credential.

It is supplied through:

```http
X-API-Key: <api_key>
```

It is not telemetry.

The Server must not expect:

```json
{
  "apiKey": "..."
}
```

as part of the official V1.1 telemetry body.

The Server must not:

- persist the API Key in `reading`;
- expose the API Key to Dashboard/App;
- use the API Key as an environmental business identifier;
- forward the API Key to CORE as a business identity.

The credential is resolved through the device credential mechanism defined by PostgreSQL/SaaS.

---

## 8. Device authentication

The Server must authenticate the request before accepting it as an authorized device telemetry submission.

Conceptual flow:

```text
X-API-Key
    ↓
device_credential
    ↓
device
```

The Server must verify that the credential is valid and associated with the claimed device identity.

A mismatch between credential and `deviceId` must not be silently accepted.

---

## 9. Context resolution

After authentication, the Server resolves the authorized operational context.

Conceptual relationship:

```text
device
   ↓
environment
   ↓
tenant
   ↓
domain
```

The device does not choose its authoritative:

```text
tenant
environment
domain
```

The Domain belongs to the environment/context, not to the physical hardware.

A device may be transferred to another environment and consequently operate under another Domain without requiring a firmware change.

---

## 10. Context supplied to CORE

After authentication and context resolution, the Server prepares the CORE request using:

```text
telemetry
+
authorized context
```

The context may include, according to the CORE integration contract:

```text
environmentId
domain
```

The API Key is not required as a business identity for CORE.

The Server must not send unauthorized context supplied arbitrarily by the device.

---

## 11. Reading persistence

A valid telemetry message represents a `reading`.

The Server must persist the raw telemetry according to:

```text
MIQAI_DB_POSTGRESQL_V1_CONTRACT.md
```

The conceptual mapping is:

```text
ESP32
  ↓
Telemetry JSON
  ↓
reading
```

The reading must preserve the original measurement information.

The Server must not insert CORE interpretation into raw telemetry columns.

---

## 12. Timestamp handling

The Telemetry V1.1 contract includes:

```text
measuredAt
```

The Server must preserve two distinct timestamps:

```text
measuredAt
    ↓
reading.measured_at

Server reception time
    ↓
reading.received_at
```

`measured_at` represents the measurement time supplied by the device.

`received_at` represents when the Server received the request.

The Server must not silently replace `measured_at` with `received_at`.

This distinction is required to support offline and delayed telemetry transmission.

---

## 13. Firmware version

`firmwareVersion` is telemetry/device metadata supplied by the ESP32.

The Server must preserve it in the `reading` according to the PostgreSQL contract.

The Server must not interpret firmware version as environmental intelligence.

---

## 14. CORE invocation

After successful authentication, context resolution and telemetry validation, the Server invokes MIQAI CORE.

Conceptually:

```text
validated telemetry
+
authorized context
        ↓
MIQAI CORE
```

The CORE invocation must follow the current CORE integration interface.

The Server is responsible for transport/orchestration.

The CORE remains responsible for:

- validation;
- normalization;
- regulatory resolution;
- metrics;
- diagnostics;
- evidence;
- hypotheses;
- mitigation;
- QAI Score;
- Public Response.

---

## 15. CORE response

The Server receives the Public Response according to:

```text
MIQAI_CORE_PUBLIC_RESPONSE_V1_CONTRACT.md
```

The Server must treat the Public Response as the authoritative CORE result.

It must not reconstruct it.

It must not calculate missing intelligence.

It must not replace CORE-generated meanings with local Server meanings.

---

## 16. Core result persistence

The complete Public Response must be persisted according to PostgreSQL V1.

Conceptually:

```text
reading
   │
   ▼
MIQAI CORE
   │
   ▼
Public Response
   │
   ▼
core_result.public_response
```

The Public Response is preserved as the authoritative public result for the reading/context.

The Server must not decompose the response into a new parallel intelligence model merely for convenience.

---

## 17. Reading and Core Result separation

The Server must maintain the distinction:

```text
reading
    = original telemetry

core_result
    = CORE-produced public interpretation
```

Do not place CORE-derived fields such as:

```text
state
assessment
evaluationPeriod
historicalAssessmentRequired
scenario
relationship
impact
action
followUp
evidence
references
score
```

into the raw ESP32 telemetry representation.

These belong to the CORE result/public response boundary.

---

## 18. Processing sequence

The nominal processing sequence is:

```text
1. Receive HTTP request
2. Read X-API-Key
3. Parse telemetry JSON
4. Validate request structure
5. Authenticate device
6. Validate deviceId/credential relationship
7. Resolve environment
8. Resolve tenant
9. Resolve domain
10. Persist reading
11. Prepare CORE input
12. Invoke CORE
13. Receive Public Response
14. Persist core_result
15. Return appropriate response
```

The exact transaction strategy may vary by implementation, but the semantic responsibilities must remain unchanged.

---

## 19. Failure boundaries

Failures must remain attributable to the correct layer.

Examples:

### Authentication failure

```text
Invalid/missing X-API-Key
```

This is an authentication failure.

### Device/context failure

```text
Unknown device
Credential/device mismatch
No authorized environment
No authorized domain
```

This is an operational/context failure.

### Telemetry validation failure

```text
Malformed JSON
Invalid field type
Missing required protocol field
```

This is a protocol/validation failure.

### CORE failure

```text
CORE unavailable
CORE integration error
CORE response invalid
```

This is an integration/CORE failure.

### Database failure

```text
Unable to persist reading
Unable to persist core_result
```

This is a persistence failure.

The Server must not convert these failures into fabricated environmental interpretations.

---

## 20. Transaction and persistence principle

The implementation must preserve traceability between:

```text
reading
   ↕
core_result
```

PostgreSQL V1 establishes the relationship between the telemetry reading and the corresponding CORE result.

A successful CORE response must be persisted as the associated `core_result`.

The Server must not silently discard a valid CORE result because a frontend representation is inconvenient.

---

## 21. Idempotency

Telemetry V1.1 does not define a `messageId`.

Therefore, the Server must not invent `messageId` semantics and present them as part of the official device contract.

Idempotency may be introduced in a future protocol version.

Until then, any operational deduplication strategy must be explicitly documented as Server behavior and must not alter the meaning of the telemetry contract.

---

## 22. Offline telemetry

The Server must support delayed arrival of telemetry.

The device may measure data while offline and transmit later.

The Server must use:

```text
measured_at
```

for measurement chronology and:

```text
received_at
```

for ingestion chronology.

Historical queries must be able to distinguish these concepts.

---

## 23. Multi-device and multi-tenant isolation

The Server must support multiple devices and multiple tenants.

A telemetry request from one device must not be associated with another device's:

- tenant;
- environment;
- Domain;
- credentials;
- historical data;
- CORE result.

Context resolution must be based on authorized registration, not on arbitrary client-supplied business identifiers.

---

## 24. Security boundaries

The Server must protect:

- API credentials;
- database credentials;
- CORE credentials/interfaces;
- tenant isolation;
- operational context.

The API Key must not be returned to the Dashboard/App.

Database service credentials must not be sent to the ESP32.

The CORE implementation and proprietary methodology must not be exposed through the Server response.

---

## 25. Public response passthrough principle

When the Server returns the CORE result to an authorized consumer, the Public Response should remain semantically equivalent to the CORE-produced response.

The Server may add transport-level metadata only when explicitly defined by the integration contract.

It must not:

- rewrite CORE intelligence;
- change Score;
- replace or reinterpret `score`;
- alter evidence;
- alter references;
- create new environmental conclusions.

---

## 26. Dashboard/SaaS boundary

The Server is not the Dashboard and is not the SaaS intelligence layer.

The downstream flow is:

```text
CORE Public Response
        ↓
SaaS persistence / API
        ↓
Dashboard / App
```

The Dashboard/App consumes the result.

The SaaS manages operational product behavior.

Neither should require the Server to recreate environmental intelligence.

---

## 27. Event and alert boundary

The current Public Response V1 does not define an explicit environmental `event` object.

Therefore, the Server must not invent an environmental EVENT merely because a reading contains:

```text
HIGH
ABOVE_REFERENCE
QAI Score
scenario
action
evidence
```

The current DB V1 contains `alert` as an operational entity.

Any future environmental EVENT must be explicitly defined in the CORE methodology and public contract before the Server is required to persist it.

Operational alerts belong to the SaaS/operational policy layer.

---

## 28. Contract gaps

The Server implementation agent must not resolve contradictions between contracts by inference.

If two official documents disagree, the agent must:

1. identify the conflicting documents;
2. identify the conflicting fields or rules;
3. register a `CONTRACT GAP`;
4. stop implementation of the affected behavior;
5. request an explicit architectural decision.

Examples of prohibited autonomous reconciliation:

```text
Old document says apiKey in JSON
New contract says X-API-Key header
```

The current official decision is the V1.1 telemetry contract:

```text
X-API-Key header
JSON without apiKey
```

Another example:

```text
Old document says no measuredAt
Current V1.1 contract includes measuredAt
```

The current official decision is:

```text
measuredAt is part of Telemetry V1.1
```

Historical documents must not override the current official contracts.

---

## 29. Contract validation before implementation

Before modifying Server code, the implementation must verify alignment with:

```text
01 — MIQAI_ESP32_TELEMETRY_V1_1_CONTRACT.md
02 — MIQAI_CORE_PUBLIC_RESPONSE_V1_CONTRACT.md
03 — MIQAI_DB_POSTGRESQL_V1_CONTRACT.md
04 — MIQAI_SERVER_INTEGRATION_V1_CONTRACT.md
```

The expected audit output is:

```text
CONFIRMED
CONTRACT GAP
NOT IMPLEMENTED
OUT OF CONTRACT
```

No code change should be justified solely by an obsolete document.

---

## 30. Official integration model

The current model is:

```text
                 ┌─────────────────────┐
                 │      ESP32          │
                 │ acquisition         │
                 │ telemetry V1.1      │
                 └──────────┬──────────┘
                            │
                  X-API-Key + JSON
                            │
                            ▼
                 ┌─────────────────────┐
                 │   MIQAI Server      │
                 │ authentication      │
                 │ context resolution  │
                 │ orchestration       │
                 │ persistence         │
                 └──────┬─────────┬────┘
                        │         │
                  reading          │ context + telemetry
                        │         ▼
                        │  ┌─────────────────────┐
                        │  │    MIQAI CORE       │
                        │  │ proprietary         │
                        │  │ environmental       │
                        │  │ intelligence        │
                        │  └──────────┬──────────┘
                        │             │
                        │      Public Response
                        │             │
                        ▼             ▼
                 ┌─────────────────────────────┐
                 │        PostgreSQL           │
                 │ reading + core_result       │
                 └──────────────┬──────────────┘
                                │
                                ▼
                         SaaS / Dashboard
```

---

## 31. Implementation principle

The Server implementation must follow this rule:

> **Implement the contracts; do not infer the contracts from the existing code.**

Existing Server code may contain historical assumptions.

Those assumptions must be evaluated against the official contracts before being retained.

The existence of a field or route in legacy code does not make it part of the current contract.

---

## 32. Change management

A change to the Server that requires changing another contract must not be implemented as a local workaround.

Instead:

```text
identify dependency
        ↓
identify affected contract
        ↓
make explicit architectural decision
        ↓
version/update affected contract
        ↓
update Server
        ↓
run integration tests
```

This prevents the Server from becoming an undocumented source of architecture.

---

## 33. Test requirements

Before considering the Server integration compliant, the following flow must be validated:

```text
ESP32
  ↓
X-API-Key + JSON V1.1
  ↓
Server authentication
  ↓
device resolution
  ↓
environment / tenant / domain resolution
  ↓
reading persistence
  ↓
CORE invocation
  ↓
real Public Response
  ↓
core_result persistence
  ↓
authorized response
```

The test must verify at minimum:

- credential authentication;
- device identity;
- tenant isolation;
- environment resolution;
- Domain resolution;
- `measured_at`;
- `received_at`;
- raw telemetry persistence;
- CORE invocation;
- Public Response integrity;
- `core_result` persistence;
- multi-device behavior;
- error handling.

---

## 34. Official responsibility matrix

| Layer | Responsibility |
|---|---|
| ESP32 | Measurement acquisition and telemetry |
| MIQAI Server | Authentication, context resolution, orchestration, transport, persistence coordination |
| MIQAI CORE | Environmental intelligence and Public Response |
| PostgreSQL | Operational and historical persistence |
| SaaS | Product operation, users, history, communication and operational alerts |
| Dashboard/App | Presentation and user experience |

---

## 35. Final architectural rule

The Server is deliberately positioned between telemetry and intelligence:

```text
ESP32
  = measures

Server
  = authenticates + resolves + orchestrates + persists

CORE
  = decides environmental intelligence

SaaS
  = manages operation and communication

Dashboard/App
  = presents
```

The Server must never become a second CORE.

> **CORE produz inteligência. JSON transporta a resposta. SaaS persiste e administra. Dashboard apresenta.**

---

## 36. Contract status

**STATUS: OFFICIAL / CURRENT**

This document is the official MIQAI Server Integration V1 contract.

It supersedes older informal Server flow descriptions where they conflict with the current official contracts.

The current authoritative contract set is:

```text
MIQAI_ESP32_TELEMETRY_V1_1_CONTRACT.md
MIQAI_SERVER_INTEGRATION_V1_CONTRACT.md
MIQAI_CORE_PUBLIC_RESPONSE_V1_CONTRACT.md
MIQAI_DB_POSTGRESQL_V1_CONTRACT.md
```

Any future breaking change must be explicitly versioned and approved.
