# MIQAI_DB_POSTGRESQL_V1_CONTRACT

**Contrato de Produção — Banco de Dados PostgreSQL MIQAI V1**

- **Sistema:** MIQAI
- **Componente:** PostgreSQL / SaaS Persistence Layer
- **Versão:** V1
- **Status:** FROZEN
- **Migration oficial:** `20260921191908_miqai_v1.sql`
- **Data de referência:** 2026-09-21
- **Compatibilidade:** PostgreSQL
- **Consumidor principal:** MIQAI SaaS (.NET/C#)
- **Fonte de inteligência:** MIQAI CORE
- **Fonte de resultado público:** `core_result.public_response`

---

## 1. Finalidade

Este documento define o **contrato de produção do Banco de Dados PostgreSQL MIQAI V1**.

Estabelece a estrutura oficial do schema, entidades, relacionamentos, campos, regras de integridade, responsabilidades do SaaS, limites de responsabilidade do PostgreSQL e regras de integração com MIQAI Server, MIQAI CORE e Dashboard.

Este documento deve ser utilizado como referência para implementação da camada de persistência do SaaS em produção.

---

## 2. Princípio arquitetural

```text
ESP32
  ↓
MIQAI Server
  ↓
MIQAI CORE
  ↓
Public Response JSON
  ↓
SaaS / Ingestion
  ↓
PostgreSQL
  ↓
SaaS API
  ↓
Dashboard / App
```

| Componente | Responsabilidade |
|---|---|
| ESP32 | Medir e transmitir telemetria |
| MIQAI Server | Receber telemetria, autenticar dispositivo e resolver contexto |
| MIQAI CORE | Produzir inteligência e Public Response |
| SaaS | Gerenciar operação, persistência, histórico e comunicação |
| PostgreSQL | Persistir dados e resultados |
| Dashboard/App | Apresentar os dados |

> **CORE decide o que está acontecendo. SaaS decide quando e como comunicar. Dashboard/App decide apenas como apresentar.**

O PostgreSQL não deve ser utilizado para recriar a inteligência do CORE.

---

## 3. Escopo V1

O banco de produção V1 possui exatamente estas sete tabelas:

```text
tenant
environment
device
device_credential
reading
core_result
alert
```

Não fazem parte do contrato V1:

- `luminosity`
- `noise`
- `battery`
- `measurementId`
- API key dentro de `reading`
- colunas relacionais para inteligência do CORE
- tabelas de eventos
- versionamento 1:N de `core_result`

---

## 4. Modelo de dados

```text
TENANT
  │
  └── ENVIRONMENT
        │
        └── DEVICE
              │
              ├── DEVICE_CREDENTIAL
              │
              └── READING
                    │
                    └── CORE_RESULT
                          │
                          └── ALERT
```

### Regras de contexto

- `Tenant` representa o cliente/organização.
- `Environment` representa o ambiente monitorado.
- `Domain` pertence ao `Environment`.
- `Device` representa o equipamento MIQAI.
- O dispositivo não conhece Tenant, Environment ou Domain como contexto de negócio.
- `environment_id` pode ser `NULL` para dispositivo em estoque/não instalado.

Domains V1:

```text
corporate
healthcare
education
residential
datacenter
```

---

# 5. Contrato das tabelas

## 5.1 `tenant`

| Campo | Tipo | NULL | Regra |
|---|---|---|---|
| `id` | uuid | NÃO | PRIMARY KEY |
| `name` | text | NÃO | Obrigatório |
| `created_at` | timestamptz | NÃO | DEFAULT `now()` |
| `updated_at` | timestamptz | NÃO | Gerenciado pela aplicação |

---

## 5.2 `environment`

| Campo | Tipo | NULL | Regra |
|---|---|---|---|
| `id` | uuid | NÃO | PRIMARY KEY |
| `tenant_id` | uuid | NÃO | FK → `tenant.id` |
| `name` | text | NÃO | Obrigatório |
| `domain` | text | NÃO | CHECK dos Domains V1 |
| `created_at` | timestamptz | NÃO | DEFAULT `now()` |
| `updated_at` | timestamptz | NÃO | Gerenciado pela aplicação |

Constraint adicional:

```text
UNIQUE (id, tenant_id)
```

---

## 5.3 `device`

| Campo | Tipo | NULL | Regra |
|---|---|---|---|
| `id` | uuid | NÃO | PRIMARY KEY |
| `device_id` | integer | NÃO | UNIQUE |
| `environment_id` | uuid | SIM | FK → `environment.id` |
| `created_at` | timestamptz | NÃO | DEFAULT `now()` |
| `updated_at` | timestamptz | NÃO | Gerenciado pela aplicação |

`environment_id = NULL` significa equipamento cadastrado mas não instalado.

---

## 5.4 `device_credential`

| Campo | Tipo | NULL | Regra |
|---|---|---|---|
| `id` | uuid | NÃO | PRIMARY KEY |
| `device_id` | uuid | NÃO | FK → `device.id` |
| `key_hash` | text | NÃO | Hash da credencial |
| `created_at` | timestamptz | NÃO | DEFAULT `now()` |
| `revoked_at` | timestamptz | SIM | Revogação |

A credencial/API key é uma credencial de autenticação e não um dado de telemetria. Não deve ser armazenada em cada `reading`.

---

# 6. Contrato de `reading`

| Campo | Tipo | NULL | Significado |
|---|---|---|---|
| `id` | bigint identity | NÃO | Identificador interno |
| `device_id` | uuid | NÃO | Dispositivo |
| `measured_at` | timestamptz | NÃO | Momento da medição |
| `received_at` | timestamptz | NÃO | Momento recebido pelo Server |
| `firmware_version` | text | NÃO | Versão do firmware |
| `temperature` | numeric(6,2) | SIM | Temperatura |
| `humidity` | numeric(6,2) | SIM | Umidade |
| `signal_strength` | integer | SIM | Intensidade do sinal |
| `co2` | numeric(10,2) | SIM | CO₂ |
| `co` | numeric(10,3) | SIM | CO |
| `pm1_0` | numeric(10,3) | SIM | PM1.0 |
| `pm25` | numeric(10,3) | SIM | PM2.5 |
| `pm4_0` | numeric(10,3) | SIM | PM4.0 |
| `pm10` | numeric(10,3) | SIM | PM10 |
| `nc0_5` | numeric(12,3) | SIM | Concentração numérica 0.5 |
| `nc1_0` | numeric(12,3) | SIM | Concentração numérica 1.0 |
| `nc2_5` | numeric(12,3) | SIM | Concentração numérica 2.5 |
| `nc4_0` | numeric(12,3) | SIM | Concentração numérica 4.0 |
| `nc10_0` | numeric(12,3) | SIM | Concentração numérica 10.0 |
| `voc_index` | numeric(8,2) | SIM | Índice VOC |
| `nox_index` | numeric(8,2) | SIM | Índice NOx |
| `typical_size` | numeric(10,4) | SIM | Tamanho típico |
| `created_at` | timestamptz | NÃO | DEFAULT `now()` |

### Regras

- Campos de sensores podem ser `NULL` para representar leitura parcial.
- `measured_at` representa o momento do fenômeno medido.
- `received_at` representa o momento em que o Server recebeu a leitura.
- `firmware_version` é snapshot histórico.
- A V1 não possui `measurementId` nem mecanismo específico de idempotência.
- O schema permite `measured_at > received_at`; esse comportamento foi testado e documentado.

---

# 7. Contrato de `core_result`

| Campo | Tipo | NULL | Regra |
|---|---|---|---|
| `id` | uuid | NÃO | PRIMARY KEY |
| `reading_id` | bigint | NÃO | FK composta → `reading(id, device_id)` |
| `tenant_id` | uuid | NÃO | Contexto do tenant |
| `environment_id` | uuid | NÃO | FK → `environment.id` |
| `device_id` | uuid | NÃO | FK → `device.id` |
| `domain` | text | NÃO | CHECK dos Domains V1 |
| `public_response` | jsonb | NÃO | Public Response do CORE |
| `created_at` | timestamptz | NÃO | DEFAULT `now()` |

### Cardinalidade

```text
reading 1 ───── 1 core_result
```

Garantida por:

```text
UNIQUE (reading_id)
```

### Public Response

`public_response` é o resultado público produzido pelo MIQAI CORE e é armazenado como `JSONB`.

Não criar nesta V1 colunas relacionais para:

```text
qai_score
diagnosis
evidence
hypotheses
mitigation
references
relationship
impact
action
followUp
```

Esses conteúdos pertencem ao Public Response.

---

# 8. Contrato de `alert`

| Campo | Tipo | NULL | Regra |
|---|---|---|---|
| `id` | uuid | NÃO | PRIMARY KEY |
| `core_result_id` | uuid | NÃO | FK composta para `core_result` |
| `tenant_id` | uuid | NÃO | FK → `tenant.id` |
| `environment_id` | uuid | NÃO | FK → `environment.id` |
| `device_id` | uuid | NÃO | FK → `device.id` |
| `type` | text | NÃO | Tipo operacional |
| `status` | text | NÃO | `PENDING`, `SENT`, `FAILED` |
| `channel` | text | NÃO | `DASHBOARD`, `APP`, `EMAIL`, `WEBHOOK` |
| `created_at` | timestamptz | NÃO | DEFAULT `now()` |
| `sent_at` | timestamptz | SIM | Momento do envio |

`alert` é uma entidade operacional do SaaS.

---

# 9. Integridade referencial

O banco deve garantir:

```text
environment.tenant_id
        ↓
tenant.id

device.environment_id
        ↓
environment.id

device_credential.device_id
        ↓
device.id

reading.device_id
        ↓
device.id

core_result.(reading_id, device_id)
        ↓
reading.(id, device_id)

core_result.(environment_id, tenant_id)
        ↓
environment.(id, tenant_id)

alert.(core_result_id, tenant_id, environment_id, device_id)
        ↓
core_result.(id, tenant_id, environment_id, device_id)
```

---

# 10. Índices obrigatórios

```text
idx_environment_tenant
idx_device_environment
idx_reading_device_measured_at
idx_core_result_environment_created_at
idx_alert_tenant_created_at
idx_alert_environment_created_at
```

Além dos índices de PRIMARY KEY e UNIQUE.

---

# 11. Contrato de integração com o SaaS

O SaaS é responsável por:

- cadastrar tenants;
- cadastrar environments;
- definir o Domain do environment;
- cadastrar devices;
- associar device a environment;
- administrar credenciais;
- persistir readings;
- persistir o Public Response;
- consultar histórico;
- gerenciar alerts;
- disponibilizar dados ao Dashboard/App.

O SaaS não deve:

- calcular QAI Score;
- reinterpretar diagnóstico;
- gerar hipóteses;
- alterar evidências;
- criar inteligência paralela;
- substituir conteúdo do CORE.

---

# 12. Fluxo de produção

```text
API Key
   ↓
Device Credential
   ↓
Device
   ↓
Environment
   ↓
Tenant / Domain
   ↓
Reading
   ↓
MIQAI CORE
   ↓
Public Response
   ↓
Core Result
   ↓
Alert, quando aplicável
```

O dispositivo não precisa conhecer:

```text
tenant
environment
domain
```

O contexto é resolvido pelo Server/SaaS.

---

# 13. Entrada de telemetria V1.1

Exemplo:

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

A API key/credencial é utilizada para autenticação e não faz parte do registro persistido em `reading`.

---

# 14. Segurança

A credencial do dispositivo deve ser tratada como segredo de autenticação.

O banco armazena:

```text
key_hash
```

A separação entre SaaS e CORE deve ser preservada:

```text
SaaS
  ↓
Contrato / Public Response
  ↓
MIQAI CORE
```

O SaaS não precisa receber o código-fonte ou metodologia proprietária do CORE.

---

# 15. Migrations

Migration oficial:

```text
20260921191908_miqai_v1.sql
```

A migration é o mecanismo oficial de evolução do schema.

Alteração de produção deve seguir:

```text
Necessidade
   ↓
Decisão técnica
   ↓
Alteração do contrato
   ↓
Nova migration
   ↓
Testes
   ↓
Auditoria
   ↓
Produção
```

Não alterar manualmente o schema remoto fora desse processo.

---

# 16. Validação

A V1 foi validada em ambiente de teste e posteriormente no banco remoto.

Principais grupos:

- T00–T02 — infraestrutura;
- T03–T04 — fluxo básico;
- T05–T09 — device/reading;
- T10–T15 — core_result;
- T16–T25 — alertas;
- T26 — JSONB;
- T27–T30 — estoque/histórico;
- T31–T39 — integridade;
- T40–T42 — credenciais;
- T43–T50 — CORE/alertas;
- T51–T55 — estrutura;
- T56–T59 — integração;
- T60–T66 — auditoria;
- T67–T73 — SQL/migration;
- T74–T79 — implantação remota.

### Registro de exceções

- **T34:** não-conclusivo na primeira execução porque outra FK foi acionada primeiro.
- **T60:** consulta inicial inadequada; auditoria corrigida passou.
- **T66:** consulta inicial inadequada; auditoria corrigida passou.
- **T73:** `db diff` limitado pela ausência de Docker/Podman; schema remoto validado diretamente.
- **T74–T79:** PASS.

---

# 17. Estado de produção

Migration aplicada:

```text
Applying migration 20260921191908_miqai_v1.sql...
Finished supabase db push.
```

Verificação:

```text
Local:  20260921191908
Remote: 20260921191908
```

Resultado:

```text
MIQAI PostgreSQL V1
        ↓
Migration aplicada
        ↓
Schema remoto validado
        ↓
Local = Remote
        ↓
FROZEN
```

---

# 18. Critério de conformidade

Uma implementação é compatível com este contrato quando:

1. utiliza as sete entidades V1;
2. preserva PKs, FKs, UNIQUEs e CHECKs;
3. preserva tipos e nulabilidade;
4. preserva os índices obrigatórios;
5. mantém `core_result.public_response` como JSONB;
6. mantém a separação entre dados operacionais e inteligência do CORE;
7. não introduz campos ou regras que alterem o contrato sem nova versão;
8. utiliza migration para alterações estruturais.

---

# 19. Status oficial

> **MIQAI_DB_POSTGRESQL_V1_CONTRACT — FROZEN**

- **Versão:** V1
- **Migration:** `20260921191908_miqai_v1.sql`
- **Status:** Contrato de produção
- **Banco:** PostgreSQL
- **Última validação:** T79 — PASS

## Regra final

> **O PostgreSQL armazena. O SaaS administra. O CORE interpreta. O Dashboard apresenta.**
