# MIQAI ESP32 — TELEMETRY V1.1 CONTRACT

**Status:** OFFICIAL / CURRENT  
**Contract:** ESP32 → MIQAI Server  
**Version:** Telemetry V1.1  
**Purpose:** Define the official HTTP request and telemetry JSON sent by the MIQAI ESP32 device to the MIQAI Server.

---

## 1. Purpose

This document is the authoritative contract for telemetry sent by the MIQAI ESP32 to the MIQAI Server.

It defines:

- HTTP transport;
- device authentication;
- telemetry JSON;
- field names and meanings;
- timestamps;
- required separation between credential and telemetry;
- offline operation requirements;
- compatibility and versioning.

The ESP32 is responsible for **measurement acquisition and telemetry transmission**.

The ESP32 does not choose:

- tenant;
- environment;
- Domain;
- regulatory criteria;
- environmental diagnosis;
- QAI Score;
- mitigation;
- Public Response interpretation.

Those responsibilities belong to the appropriate MIQAI layers.

---

## 2. Source of truth

**STATUS: OFFICIAL / CURRENT**

This document supersedes older informal descriptions of the ESP32 telemetry contract where they conflict with this document.

In particular, any older document that places `apiKey` inside the telemetry JSON is superseded.

The current contract is:

```text
HTTP Header
X-API-Key: <api_key>

HTTP Body
JSON telemetry without apiKey
```

Future changes must be explicitly versioned.

---

## 3. Architectural position

```text
ESP32
  │
  │ Telemetry V1.1
  ▼
MIQAI Server
  │
  ├── authenticates device
  ├── resolves authorized context
  └── forwards telemetry + context to CORE
```

The device does not directly select or transmit the tenant, environment or Domain as authoritative business context.

The Server resolves that context from the authorized device registration.

---

## 4. Transmission frequency

The ESP32 sends telemetry approximately once every **60 seconds** during normal operation.

The Server must accept asynchronous arrivals and must not assume that every message arrives exactly 60 seconds after the previous message.

Offline operation may cause delayed delivery.

---

## 5. HTTP request contract

The telemetry request uses HTTP.

### Method

```http
POST
```

### Endpoint

The concrete production endpoint is defined by the MIQAI Server deployment configuration.

This document defines the request contract, not a fixed public hostname.

### Headers

```http
Content-Type: application/json
X-API-Key: <api_key>
```

The `X-API-Key` header carries the device credential.

The credential is not telemetry.

---

## 6. Authentication rule

The API Key is a device credential.

It is used by the Server to authenticate the request and resolve the device identity.

Conceptually:

```text
X-API-Key
    ↓
device_credential
    ↓
device
    ↓
environment
    ↓
tenant
    ↓
domain
```

The API Key:

- belongs to the authentication layer;
- is not a sensor measurement;
- is not part of the telemetry JSON;
- must not be persisted in `reading`;
- must not be exposed to the Dashboard;
- must not be forwarded to the CORE as a business identity.

The database stores the credential separately according to the PostgreSQL V1 contract.

---

## 7. Telemetry JSON — official V1.1

The HTTP request body is JSON.

Official example:

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

## 8. Official telemetry fields

| Field | Type | Unit | Description |
|---|---|---|---|
| `deviceId` | integer | — | Identifier of the physical device |
| `firmwareVersion` | string | — | Firmware version producing the telemetry |
| `measuredAt` | ISO 8601 timestamp | UTC | Time associated with the measurement |
| `temperature` | number/null | °C | Temperature measurement |
| `humidity` | number/null | % | Relative humidity measurement |
| `signalStrength` | integer/null | dBm | Wireless signal strength |
| `co2` | number/null | ppm | CO₂ measurement |
| `co` | number/null | ppm | CO measurement |
| `pm1_0` | number/null | µg/m³ | PM1.0 measurement |
| `pm25` | number/null | µg/m³ | PM2.5 measurement |
| `pm4_0` | number/null | µg/m³ | PM4.0 measurement |
| `pm10` | number/null | µg/m³ | PM10 measurement |
| `nc0_5` | number/null | particles/cm³ | Particle number concentration for 0.5 µm |
| `nc1_0` | number/null | particles/cm³ | Particle number concentration for 1.0 µm |
| `nc2_5` | number/null | particles/cm³ | Particle number concentration for 2.5 µm |
| `nc4_0` | number/null | particles/cm³ | Particle number concentration for 4.0 µm |
| `nc10_0` | number/null | particles/cm³ | Particle number concentration for 10.0 µm |
| `vocIndex` | number/null | index | VOC index |
| `noxIndex` | number/null | index | NOx index |
| `typicalSize` | number/null | µm | Typical particle size |

Where the device does not have a valid measurement for a sensor field, `null` may be used.

The Server must preserve valid telemetry values and must not invent substitute measurements.

---

## 9. `measuredAt` and offline operation

`measuredAt` is part of the official Telemetry V1.1 contract.

It represents the time associated with the measurement at the device.

This field is required because the ESP32 may operate without continuous network connectivity.

The system distinguishes:

```text
measuredAt
    = time associated with the measurement

received_at
    = time when the MIQAI Server receives the telemetry
```

The Server/database must preserve both concepts.

The PostgreSQL V1 `reading` record therefore uses:

```text
measured_at
received_at
```

A delayed transmission must not cause the Server to silently replace the measurement time with the reception time.

---

## 10. `deviceId`

`deviceId` identifies the physical device associated with the telemetry.

The Server must authenticate and validate the relationship between the presented credential and the device identity.

The device must not use the telemetry payload to select an arbitrary tenant or environment.

The authoritative device registration is maintained by the operational system.

---

## 11. Context and Domain

The ESP32 does not determine the business context.

The device does not authoritatively select:

```text
tenant
environment
domain
```

The Server resolves:

```text
device
  ↓
environment
  ↓
tenant
  ↓
domain
```

The resolved context is then supplied to CORE according to the CORE integration contract.

---

## 12. Fields explicitly excluded from V1.1

The following fields are not part of the official Telemetry V1.1 JSON:

```text
apiKey
battery
luminosity
noise
tenant
tenantId
environment
environmentId
domain
score
diagnosis
assessment
state
evidence
mitigation
publicResponse
```

In particular:

> `apiKey` MUST NOT be added to the telemetry JSON.

Authentication uses:

```http
X-API-Key: <api_key>
```

---

## 13. Telemetry versus CORE intelligence

The ESP32 sends measurements.

It does not send CORE interpretation.

The following are not ESP32 responsibilities:

- QAI Score;
- diagnosis;
- regulatory compliance;
- evidence;
- hypotheses;
- mitigation;
- environmental scenario;
- relationship;
- impact classification;
- Public Response.

Those outputs are produced by MIQAI CORE.

---

## 14. Server processing boundary

After receiving a valid request, the Server is responsible for:

1. receiving the HTTP request;
2. authenticating `X-API-Key`;
3. validating the device identity;
4. resolving the authorized environment/tenant/domain context;
5. recording the telemetry;
6. sending the required telemetry and context to CORE;
7. receiving the Public Response;
8. persisting the CORE result according to the database contract.

The Server must not create environmental intelligence that is absent from CORE.

---

## 15. Data integrity

The Server must not silently:

- rename fields into different meanings;
- invent missing measurements;
- replace `measuredAt` with `received_at`;
- infer tenant/environment/domain from arbitrary device payload fields;
- calculate QAI Score;
- create a regulatory assessment;
- create a diagnosis;
- create evidence;
- create mitigation.

Validation errors must be explicit.

---

## 16. Offline and delayed delivery

The device may temporarily lose network connectivity.

When telemetry is subsequently transmitted, `measuredAt` identifies the measurement time.

The Server records its own reception timestamp independently.

The protocol therefore supports:

```text
Measurement
    ↓
local/offline period
    ↓
network restored
    ↓
HTTP transmission
    ↓
Server received_at
```

The contract does not require `messageId` in V1.1.

Idempotency/message identity is a possible future protocol evolution and must not be invented by the Server as an undocumented contract field.

---

## 17. Security

The API Key is a credential and must be handled as sensitive authentication material.

Rules:

- do not include it in telemetry JSON;
- do not persist it in `reading`;
- do not expose it to Dashboard/App;
- do not log it in plaintext;
- store credential material according to the security policy of the authentication system;
- PostgreSQL V1 stores credential information separately in `device_credential`.

The ESP32 must not receive database service credentials.

---

## 18. Example complete request

```http
POST /telemetry HTTP/1.1
Host: <miqai-server>
Content-Type: application/json
X-API-Key: <api_key>

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

## 19. Contract validation checklist

A Telemetry V1.1 request is structurally compliant when:

- HTTP method is `POST`;
- `Content-Type` is `application/json`;
- `X-API-Key` is present as the authentication credential;
- `apiKey` is absent from the JSON body;
- `deviceId` is present;
- `firmwareVersion` is present;
- `measuredAt` is present and represents measurement time;
- telemetry field names match this contract;
- unsupported fields are not used as authoritative business context;
- tenant/environment/domain are resolved by the Server;
- CORE intelligence is not included in the device payload.

---

## 20. Versioning

This document defines **Telemetry V1.1**.

A breaking change to the telemetry protocol requires a new contract version.

Examples of breaking changes:

- removing a field;
- changing a field's meaning;
- changing a field type incompatibly;
- moving authentication into the JSON body;
- removing `measuredAt`;
- changing the semantics of `deviceId`.

The Server must not silently interpret a future incompatible contract as V1.1.

---

## 21. Relationship with other official contracts

This contract must be read together with:

```text
MIQAI_DB_POSTGRESQL_V1_CONTRACT.md
MIQAI_CORE_PUBLIC_RESPONSE_V1_CONTRACT.md
```

Responsibilities remain separated:

```text
ESP32
  = acquisition + telemetry

Server
  = authentication + context resolution + orchestration

CORE
  = environmental intelligence + Public Response

PostgreSQL
  = persistence

SaaS
  = operation + history + communication

Dashboard/App
  = presentation
```

---

## 22. Official boundary

The authoritative device boundary is:

```text
ESP32
   │
   ├── X-API-Key: credential
   │
   └── JSON: telemetry
           │
           ▼
      MIQAI Server
```

The API Key authenticates.

The JSON measures.

They are deliberately separate.

---

## 23. Contract status

**STATUS: OFFICIAL / CURRENT**

This document supersedes older informal ESP32 telemetry examples and descriptions where they conflict with Telemetry V1.1.

In particular:

```text
OLD / SUPERSEDED
JSON → apiKey

CURRENT
Header → X-API-Key
Body   → telemetry JSON without apiKey
```

`measuredAt` is part of the current official V1.1 telemetry contract.

Any future change must be explicitly versioned and approved.
