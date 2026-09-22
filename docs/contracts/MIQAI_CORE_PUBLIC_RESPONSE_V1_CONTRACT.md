# MIQAI CORE — PUBLIC RESPONSE V1 CONTRACT

**Status:** OFFICIAL / CURRENT  
**Contract:** CORE → Server / SaaS  
**Version:** Public Response V1  
**Purpose:** Contract for consumption of the public response produced by MIQAI CORE.

---

## 1. Purpose

This document defines the public contract produced by **MIQAI CORE** and consumed by the MIQAI Server and downstream SaaS components.

The contract defines **what the CORE returns**, not how the CORE internally calculates or decides it.

The MIQAI CORE remains the proprietary intelligence layer of MIQAI.

> **CORE produces intelligence. JSON transports the response. SaaS persists and administers. Dashboard presents.**

The Server, SaaS and Dashboard must consume the Public Response as provided and must not recreate the intelligence contained in it.

---

## 2. Source of truth

For the current implementation, this document is an **official/current contract**.

Older documents, examples, drafts or historical conversations that conflict with this contract must not be used as implementation sources.

When a future document changes this contract, the change must be explicitly versioned and approved. No implementation layer should silently reconcile conflicting contract versions.

---

## 3. Architectural position

The Public Response belongs to the following flow:

```text
ESP32
  ↓
MIQAI Server
  ↓
MIQAI CORE
  ↓
Public Response V1
  ↓
SaaS / Ingestion
  ↓
PostgreSQL
  ↓
SaaS API
  ↓
Dashboard / App
```

The Server is responsible for transport, authentication, context resolution and orchestration.

The CORE is responsible for environmental intelligence.

The SaaS is responsible for persistence, operation, history and product communication.

The Dashboard/App is responsible only for presentation and user experience.

---

## 4. Public Response root structure

The Public Response V1 root object contains:

```text
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

The exact JSON structure returned by the CORE is authoritative for field names, types and nesting.

A consumer must not add intelligence fields to the Public Response.

---

## 5. Root fields

### 5.1 `version`

Identifies the Public Response contract version.

Example:

```json
"version": "1.0"
```

This is a contract version, not a CORE software/package version.

---

### 5.2 `timestamp`

Timestamp associated with the generated Public Response.

Example:

```json
"timestamp": "2026-09-21T10:53:00Z"
```

The consumer must preserve the value supplied by the CORE.

---

### 5.3 `status`

Represents the status of the generated response.

The consumer must not reinterpret this field or create additional status semantics.

---

### 5.4 `environment`

Identifies the environmental context associated with the analysis.

The Domain/context is supplied to the CORE by the authorized integration flow. The device itself does not choose its Domain.

---

## 6. `current`

`current` contains the current environmental readings and CORE-derived interpretation associated with those readings.

The public reading representation uses:

```text
parameter
value
unit
state
assessment
evaluationPeriod
historicalAssessmentRequired
```

Example:

```json
{
  "parameter": "temperature",
  "value": 26.89,
  "unit": "°C",
  "state": "HIGH",
  "assessment": "ABOVE_REFERENCE",
  "evaluationPeriod": "instant",
  "historicalAssessmentRequired": false
}
```

A missing reading may be represented with:

```json
{
  "parameter": "vocIndex",
  "value": null,
  "unit": null,
  "state": "MISSING",
  "assessment": "MISSING",
  "evaluationPeriod": null,
  "historicalAssessmentRequired": false
}
```

The Dashboard/App must not calculate `state`, `assessment`, `evaluationPeriod` or `historicalAssessmentRequired`.

---

## 7. Semantic rules for current readings

The following semantics are part of the current MIQAI contract:

### PASS

Formal criterion approval.

### FAIL

Formal criterion failure.

### OBSERVATION

Analytical/contextual observation.

`OBSERVATION` must not automatically be treated as `FAIL`.

### MISSING

The expected value is absent or unavailable.

### NOT_ASSESSED

No formal active criterion was assessed for that condition, or the criterion is not applicable.

`ABOVE_REFERENCE` does not automatically mean regulatory `FAIL`.

For parameters whose formal reference period is historical, an instantaneous value may require historical assessment rather than immediate compliance classification.

The consumer must preserve these semantics and must not replace them with its own severity model.

---

## 8. QAI Score V1

The Public Response exposes the QAI Score through a public object.

Structure:

```json
{
  "available": true,
  "value": 0,
  "level": "POOR",
  "publicInterpretation": {
    "title": "Condição ambiental preocupante",
    "description": "O nível geral do ambiente está abaixo do desejado. Esse resultado indica que a condição atual exige atenção e acompanhamento mais próximo."
  },
  "attention": {
    "available": true,
    "parameter": "humidity",
    "title": "Principal ponto de atenção",
    "description": "A umidade relativa é o principal fator que está reduzindo o QAI Score nesta leitura."
  }
}
```

### 8.1 Public Score fields

`available`

Indicates whether a valid Score was produced.

`value`

Quantitative result on the 0–100 scale when available.

`level`

One of:

```text
EXCELLENT
GOOD
MODERATE
POOR
UNKNOWN
```

`publicInterpretation`

Human-readable interpretation produced by the Public Response layer.

`attention`

Controlled public translation of the internal dominant factor.

---

## 9. QAI Score — public boundary

The following internal CORE fields are **not part of the Public Response contract**:

```text
dominantFactor
components
```

The Server, SaaS and Dashboard must not reconstruct them from other fields.

The Dashboard must not calculate the QAI Score.

The SaaS must not calculate the QAI Score.

A consumer must not create a partial Score when the CORE reports the Score as unavailable.

### UNKNOWN

Example:

```json
{
  "available": false,
  "value": null,
  "level": "UNKNOWN",
  "publicInterpretation": {
    "title": "QAI Score indisponível",
    "description": "Não há dados suficientes para calcular o QAI Score nesta leitura."
  },
  "attention": {
    "available": false,
    "parameter": null,
    "title": null,
    "description": null
  }
}
```

There is no public partial Score.

When multiple components are tied as the lowest component internally, the public `attention` must remain unavailable rather than inventing a single dominant factor.

---

## 10. QAI Score methodology boundary

The Public Response communicates the result; it does not expose the proprietary calculation process.

The current QAI Score V1 is a MIQAI methodology using a 0–100 scale and the approved normalization/aggregation methodology.

The public contract does not authorize the SaaS or Dashboard to reproduce the mathematical calculation.

Public explanation:

> O QAI Score V1 é calculado com base na metodologia de normalização e agregação do ATLAS IEQ (2026), utilizando referências técnicas e científicas aplicáveis a cada parâmetro.

The Public Response remains the authoritative result.

---

## 11. `scenario`

`scenario` contains the environmental scenario identified by the CORE.

Example:

```json
{
  "id": "warm_humid",
  "description": "..."
}
```

The consumer must not create or modify scenario classification.

---

## 12. `relationship`

`relationship` contains a relationship identified by the CORE.

Example:

```json
{
  "id": "warm_humid_high_co2",
  "description": "..."
}
```

Relationships are CORE intelligence.

The SaaS and Dashboard must not infer relationships from individual readings.

---

## 13. `impacts`

`impacts` contains impacts identified by the CORE.

Each impact is part of the CORE's analytical response.

The consumer must not create additional impacts or convert an impact into a diagnosis or regulatory conclusion.

---

## 14. `action`

`action` contains mitigation/action guidance produced by the CORE.

The consumer may present the action but must not create, strengthen, reinterpret or replace the environmental recommendation.

Example conceptual structure:

```json
{
  "primary": {
    "id": "control_humidity",
    "title": "...",
    "description": "..."
  },
  "additional": [
    {
      "id": "inspect_hvac_system",
      "title": "...",
      "description": "..."
    }
  ]
}
```

---

## 15. `followUp`

`followUp` contains guidance concerning what should be accompanied, verified or evaluated subsequently.

It is not a generic application task list.

The consumer must preserve the meaning supplied by the CORE.

---

## 16. `evidence`

Evidence is supplied by the CORE as part of the Public Response.

Public structure:

```json
{
  "available": true,
  "explanation": "...",
  "items": []
}
```

The consumer must not create evidence from raw measurements.

The consumer must not substitute its own explanation for the CORE explanation.

---

## 17. `references`

References are supplied by the CORE as part of the Public Response.

Public structure:

```json
{
  "available": true,
  "items": []
}
```

References must be preserved as supplied.

The Dashboard must not invent, replace or reinterpret regulatory/technical references.

---

## 18. What the Server may do

The Server may:

- authenticate the device;
- resolve authorized tenant/environment/domain context;
- provide the context required by CORE;
- send telemetry and authorized context to CORE;
- receive the Public Response;
- validate transport/schema requirements;
- persist the Public Response;
- return the Public Response to the appropriate consumer;
- record operational metadata required by the integration.

The Server must not:

- calculate QAI Score;
- create environmental diagnosis;
- create regulatory rules;
- reconstruct evidence;
- reconstruct mitigation;
- infer occupancy;
- create health-risk intelligence;
- create a parallel environmental interpretation;
- modify the CORE's analytical result for convenience of persistence.

---

## 19. What the SaaS may do

The SaaS may:

- persist the Public Response;
- provide historical queries;
- manage tenants, environments and devices;
- manage operational state;
- manage users and permissions;
- communicate CORE results to authorized users;
- create operational alerts according to explicit product policy and available CORE information.

The SaaS must not:

- recalculate Score;
- recreate `attention`;
- infer a new environmental diagnosis;
- reinterpret regulatory criteria;
- invent evidence;
- invent references;
- create environmental intelligence parallel to CORE.

---

## 20. What the Dashboard/App may do

The Dashboard/App may:

- present the Public Response;
- organize information visually;
- provide navigation and filtering;
- display historical Public Responses;
- display actions and follow-up guidance supplied by CORE;
- present operational alerts supplied by SaaS.

The Dashboard/App must not:

- calculate environmental metrics;
- calculate QAI Score;
- create severity;
- create compliance;
- infer risk;
- infer occupancy;
- invent trends;
- reinterpret legislation;
- generate new environmental recommendations.

---

## 21. Persistence rule

The complete Public Response should be preserved for traceability.

PostgreSQL V1 uses:

```text
core_result
└── public_response JSONB
```

The database must not require reconstruction of the Public Response from multiple derived columns.

The persisted object should remain the response produced by CORE.

---

## 22. Reading versus Core Result

A `reading` is the telemetry received from the device.

A `core_result` is the public interpretation produced by CORE for that reading and authorized context.

Do not mix CORE-derived fields with raw ESP32 telemetry.

Conceptually:

```text
ESP32 telemetry
      ↓
    reading
      ↓
     CORE
      ↓
core_result.public_response
```

The Public Response is not a replacement for the original telemetry reading.

---

## 23. Error and unavailable data principles

If the CORE cannot produce a valid public result for a component, the consumer must preserve the explicit unavailable state.

The consumer must not:

- fabricate a value;
- substitute a default value;
- calculate a replacement;
- infer a result from neighboring parameters;
- silently discard the unavailable state.

Unknown or missing information remains unknown or missing.

---

## 24. Versioning and compatibility

The `version` field identifies the Public Response contract.

Breaking changes require a new contract version.

Examples of breaking changes include:

- changing field meaning;
- changing field type;
- removing required fields;
- changing the semantic meaning of existing states;
- changing the structure in a way that invalidates existing consumers.

Non-breaking additions may be introduced only when they preserve existing semantics and consumer compatibility.

A consumer must not silently reinterpret a new version as an older contract.

---

## 25. Contract validation

Before a Server release consumes a new Public Response version, the integration must validate at minimum:

1. JSON structure;
2. required fields;
3. field types;
4. `qaiScore` public structure;
5. `evidence` structure;
6. `references` structure;
7. `current` reading semantics;
8. preservation of `UNKNOWN`, `MISSING`, `OBSERVATION` and `NOT_ASSESSED`;
9. preservation of CORE-generated scenario/relationship/impact/action/followUp;
10. persistence of the complete Public Response.

Validation failure must not be silently corrected by the Server.

---

## 26. Explicit non-responsibilities

This contract does not define:

- ESP32 telemetry transport;
- `X-API-Key` authentication;
- PostgreSQL schema;
- SaaS authentication;
- Dashboard visual design;
- internal CORE algorithms;
- regulatory methodology implementation details;
- sensor calibration;
- firmware implementation.

Those subjects belong to their respective contracts.

---

## 27. Official boundary

The authoritative boundary is:

```text
MIQAI CORE
    │
    │  Public Response V1
    ▼
MIQAI Server / SaaS
```

The Server and SaaS consume the result.

They do not recreate the intelligence that produced it.

> **CORE decide o que está acontecendo. SaaS decide quando e como comunicar. Dashboard/App decide apenas como apresentar.**

---

## 28. Contract status

**STATUS: OFFICIAL / CURRENT**

This document supersedes older informal descriptions of the MIQAI CORE Public Response where they conflict with this contract.

The contract must be changed through an explicit versioned decision.

