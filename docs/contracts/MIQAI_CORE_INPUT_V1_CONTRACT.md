# MIQAI CORE INPUT V1 CONTRACT

**Documento:** `MIQAI_CORE_INPUT_V1_CONTRACT.md`  
**Componente:** MIQAI CORE  
**Interface:** MIQAI Server V1 → MIQAI CORE  
**Status:** Derivado do código congelado do CORE QAI disponibilizado em 22/09/2026  
**Objetivo:** Formalizar a interface de entrada pública atualmente implementada pelo CORE, sem alterar o CORE.

---

## 1. Objetivo

Este documento formaliza a interface pública utilizada pelo MIQAI Server V1 para invocar o MIQAI CORE.

O contrato é derivado diretamente da API pública e dos módulos de normalização e resolução de Domain existentes no CORE analisado.

**Este documento não propõe alteração de código ou de comportamento do CORE.**

---

## 2. API pública oficial

O ponto de entrada público do CORE é:

```js
AnalisarQualidadeAmbiental({
    reading,
    environment
})
```

A função é exportada por:

```text
src/engine/analysis.js
```

O CORE define dois campos de entrada no nível superior:

| Campo | Tipo | Obrigatório | Função |
|---|---|---:|---|
| `reading` | objeto | Sim | Telemetria/leitura ambiental submetida à análise |
| `environment` | string | Não | Identificador do ambiente utilizado para resolver o Domain |

O `environment` possui fallback interno para `corporate` quando ausente.

---

## 3. Estrutura oficial da entrada

Exemplo de entrada válida observada nos testes do próprio CORE:

```json
{
  "environment": "corporate",
  "reading": {
    "temperature": 23,
    "humidity": 50,
    "co2": 650,
    "pm25": 6,
    "pm10": 12,
    "vocIndex": 90,
    "noxIndex": 1
  }
}
```

O Server deve chamar a API pública do CORE. Não deve acessar diretamente módulos internos do pipeline.

---

## 4. Campo `environment`

`environment` é uma **string**.

O resolver de Domain atualmente reconhece:

```text
corporate
healthcare
education
residential
datacenter
```

O mapeamento implementado pelo CORE é:

| `environment` | Domain resolvido |
|---|---|
| `corporate` | Corporate |
| `healthcare` | Healthcare |
| `education` | Education |
| `residential` | Residential |
| `datacenter` | Datacenter |

A resolução é feita internamente pelo CORE.

### 4.1 Fallback

O código atual utiliza:

```js
String(ctx.environment ?? "corporate").toLowerCase()
```

e, caso o valor não corresponda a um Domain conhecido, utiliza `CORPORATE_DOMAIN`.

Portanto:

- o Server deve fornecer um `environment` autorizado e conhecido;
- o Server **não deve implementar uma segunda lógica de resolução de Domain**;
- o Server **não deve enviar `domain` como campo adicional da API pública do CORE**.

---

## 5. Campo `reading`

`reading` é o objeto de telemetria fornecido ao CORE.

A normalização atualmente implementada pelo CORE reconhece os seguintes campos.

### 5.1 Identificação

| Campo | Tipo normalizado | Observação |
|---|---|---|
| `deviceId` | valor original | Identificação do dispositivo |
| `device_id` | valor original | Alias aceito para `deviceId` |
| `created_at` | valor original | Preservado pelo normalizador |

Quando `deviceId` está presente, ele é preferido a `device_id`.

### 5.2 Conforto térmico

| Campo | Tipo normalizado |
|---|---|
| `temperature` | número ou `null` |
| `humidity` | número ou `null` |

### 5.3 Gases

| Campo | Tipo normalizado |
|---|---|
| `co2` | número ou `null` |
| `vocIndex` | número ou `null` |
| `noxIndex` | número ou `null` |

### 5.4 Material particulado

| Campo | Tipo normalizado |
|---|---|
| `pm1_0` | número ou `null` |
| `pm25` | número ou `null` |
| `pm4_0` | número ou `null` |
| `pm10` | número ou `null` |

### 5.5 Contagem de partículas

| Campo | Tipo normalizado |
|---|---|
| `nc0_5` | número ou `null` |
| `nc1_0` | número ou `null` |
| `nc2_5` | número ou `null` |
| `nc4_0` | número ou `null` |
| `nc10_0` | número ou `null` |

### 5.6 Sensor

| Campo | Tipo normalizado |
|---|---|
| `typicalSize` | número ou `null` |

### 5.7 Sinal do dispositivo

| Campo | Tipo normalizado |
|---|---|
| `signalStrength` | número ou `null` |

O CORE também aceita `signal` como alias de entrada para `signalStrength`:

```js
signalStrength:
    normalizeNumber(
        r.signalStrength ??
        r.signal
    )
```

---

## 6. Normalização numérica

Os campos numéricos reconhecidos pelo normalizador são convertidos para número.

A regra implementada é:

- `null` → `null`
- `undefined` → `null`
- `""` → `null`
- valor numericamente finito → número
- valor não convertido para número finito → `null`

Exemplo:

```text
"23"      → 23
23        → 23
null      → null
""        → null
"abc"     → null
```

A normalização não representa, por si só, uma validação regulatória ou diagnóstico.

---

## 7. Campos da telemetria que NÃO fazem parte do objeto normalizado do CORE

A telemetria ESP32 possui campos próprios do contrato de ingestão do Server, como:

- `firmwareVersion`
- `measuredAt`
- `received_at` (gerado pelo Server)

Esses campos não aparecem entre os campos preservados pelo `normalize.js` analisado.

Portanto, o Server deve separar claramente:

1. **dados operacionais/persistidos da leitura**, mantidos no banco;
2. **dados efetivamente enviados ao objeto `reading` do CORE**.

O Server não deve presumir que todo campo da telemetria ESP32 será utilizado pelo CORE.

---

## 8. Campos que NÃO devem ser adicionados à API pública do CORE

A API pública atual não define:

```text
tenantId
tenant_id
environmentId
environment_id
domain
apiKey
key_hash
device_credential
```

Esses dados pertencem à camada de autenticação, contexto, persistência e governança do Server/SaaS.

Em particular:

- `apiKey` é credencial de autenticação;
- `key_hash` é dado de persistência da credencial;
- `tenant_id` pertence ao contexto de segurança/tenancy;
- `environment_id` pertence ao modelo operacional do SaaS/DB;
- `domain` é resolvido pelo CORE a partir de `environment`.

O Server não deve ampliar a assinatura pública do CORE com esses campos.

---

## 9. Separação Server → CORE

O fluxo conceitual é:

```text
ESP32
  |
  | Telemetria V1.1 + X-API-Key
  v
MIQAI Server V1
  |
  | autenticação
  | resolução de contexto
  | persistência da leitura
  |
  | reading + environment
  v
MIQAI CORE
  |
  | normalização
  | Domain
  | regulatory
  | validation
  | metrics
  | diagnosis
  | evidence
  | hypotheses
  | mitigation
  | relationships
  | impacts
  | references
  v
Public Response
```

O Server é responsável por preparar a chamada.

O CORE é responsável pela inteligência ambiental.

---

## 10. Regra de domínio

O Server possui o contexto autorizado do dispositivo por meio da cadeia de segurança e relacionamento do SaaS/DB.

Entretanto, para a chamada do CORE:

```js
AnalisarQualidadeAmbiental({
    reading,
    environment
})
```

o valor enviado em `environment` deve representar o ambiente autorizado que deve orientar a análise.

O Server não deve duplicar a implementação interna do resolver de Domain.

---

## 11. Exemplo de chamada

Exemplo conceitual:

```js
const coreResponse = AnalisarQualidadeAmbiental({
    environment: authorizedEnvironment,
    reading: {
        deviceId: telemetry.deviceId,
        temperature: telemetry.temperature,
        humidity: telemetry.humidity,
        co2: telemetry.co2,
        co: telemetry.co,
        pm1_0: telemetry.pm1_0,
        pm25: telemetry.pm25,
        pm4_0: telemetry.pm4_0,
        pm10: telemetry.pm10,
        nc0_5: telemetry.nc0_5,
        nc1_0: telemetry.nc1_0,
        nc2_5: telemetry.nc2_5,
        nc4_0: telemetry.nc4_0,
        nc10_0: telemetry.nc10_0,
        vocIndex: telemetry.vocIndex,
        noxIndex: telemetry.noxIndex,
        typicalSize: telemetry.typicalSize,
        signalStrength: telemetry.signalStrength
    }
});
```

**Observação:** o exemplo é uma representação de integração. A implementação do Server deve respeitar os contratos de telemetria e banco já congelados.

---

## 12. Restrições de integração

### O Server DEVE

- utilizar a API pública `AnalisarQualidadeAmbiental`;
- enviar `reading` como objeto de leitura;
- enviar `environment` como string autorizada;
- preservar a separação entre autenticação/contexto e inteligência;
- receber o resultado produzido pelo CORE;
- persistir o Public Response conforme o contrato do banco.

### O Server NÃO DEVE

- importar módulos internos do CORE para executar etapas isoladas;
- recalcular métricas produzidas pelo CORE;
- implementar diagnóstico paralelo;
- implementar regras regulatórias paralelas;
- inferir Domain independentemente do CORE;
- enviar API key ou `key_hash` ao CORE;
- alterar o contrato público do CORE para facilitar o Server.

---

## 13. Relação com o Public Response

A saída do CORE continua sendo tratada pelo contrato:

```text
MIQAI_CORE_PUBLIC_RESPONSE_V1_CONTRACT.md
```

O Server não deve reconstruir artificialmente a inteligência retornada pelo CORE.

Quando o `public_response` for persistido em `core_result`, deve ser preservado como JSONB conforme o contrato do banco.

---

## 14. Base técnica deste contrato

Este documento foi derivado da implementação do CORE disponibilizada em 22/09/2026, especialmente:

```text
src/engine/analysis.js
src/engine/context.js
src/engine/normalize.js
src/domains/index.js
src/domains/corporateDomain.js
src/domains/healthcareDomain.js
src/domains/educationDomain.js
src/domains/residentialDomain.js
src/domains/datacenterDomain.js
tests/pipeline.e2e.test.js
tests/integration/jsonContract.test.js
tests/integration/publicResponse.test.js
tests/integration/jsonReal.test.js
tests/integration/generateRealJson.test.js
```

A API pública observada nos testes é:

```js
AnalisarQualidadeAmbiental({
    environment: "corporate",
    reading: {
        temperature: 23,
        humidity: 50,
        co2: 650,
        pm25: 6,
        pm10: 12,
        vocIndex: 90,
        noxIndex: 1
    }
});
```

---

## 15. Status

**MIQAI CORE INPUT V1 — FORMALIZAÇÃO DA INTERFACE EXISTENTE**

Este documento formaliza o comportamento encontrado no CORE analisado.

Ele **não congela novos comportamentos**, não altera o CORE e não cria novos campos na API pública.

Qualquer mudança futura na assinatura:

```js
AnalisarQualidadeAmbiental({
    reading,
    environment
})
```

deve ser tratada como mudança de contrato e submetida a decisão metodológica/arquitetural antes da implementação no MIQAI Server V1.
