# MIQAI — Credenciais, API Key e Autenticação V1
## Documento de trabalho e prompt para estudo dedicado

**Status:** WORKING DOCUMENT / NÃO CONGELADO  
**Data:** 22/09/2026  
**Escopo:** credenciais, autenticação, provisioning e ativação de dispositivos MIQAI  
**Não altera:** MIQAI CORE, Public Response V1 ou estrutura PostgreSQL V1

---

## 1. Objetivo

Este documento registra a decisão operacional atual para o MVP/testes e define o escopo de um estudo separado sobre a solução definitiva de credenciais e autenticação do MIQAI.

A intenção é permitir que o desenvolvimento e os testes ponta a ponta continuem sem bloquear o projeto por uma decisão ainda não fechada sobre provisioning, ownership e ativação comercial.

> **Agora simplificar para testar. Em paralelo, estudar a solução definitiva sem alterar o CORE.**

---

## 2. Decisão atual para MVP / testes

Para o MVP e para os testes atuais:

1. A API Key será configurada manualmente no dispositivo/firmware.
2. O dispositivo será previamente cadastrado e autorizado no SaaS.
3. O dispositivo poderá enviar sua telemetria utilizando essa API Key.
4. O MIQAI Server realizará a autenticação/identificação conforme o fluxo técnico definido para o ambiente de teste.
5. Após a identificação e resolução do contexto autorizado, o Server encaminhará a telemetria ao MIQAI CORE.
6. O CORE continuará responsável exclusivamente pela inteligência ambiental.
7. O Public Response continuará sendo o contrato de resposta do CORE.
8. O SaaS continuará responsável pelo cadastro, associação, persistência e operação.
9. O Dashboard continuará sendo apenas camada de apresentação.

### Fluxo atual

```text
ESP32
  |
  | API Key configurada manualmente
  v
MIQAI Server
  |
  | autenticação / identificação do Device
  v
MIQAI CORE
  |
  | inteligência ambiental
  v
Public Response
  |
  v
SaaS / PostgreSQL
  |
  v
Dashboard
```

Esta solução é deliberadamente simples e temporária para desenvolvimento e validação.

---

## 3. O que NÃO será resolvido agora

O estudo definitivo não deve bloquear os testes atuais e não deve provocar alterações prematuras em componentes congelados.

Não serão introduzidos agora, como requisito do MVP:

- QR Code de ativação;
- código de ativação enviado por SMS/e-mail;
- provisioning automático de fábrica;
- prova formal de propriedade;
- transferência de propriedade;
- recuperação de credencial pelo cliente;
- reset comercial;
- fluxo de revenda;
- gestão completa do ciclo de vida comercial;
- mecanismo definitivo de rotação de credenciais.

Esses temas serão estudados separadamente.

---

## 4. Princípio arquitetural

A autenticação deve permanecer fora do MIQAI CORE.

O CORE não deve conhecer ou tratar:

- API Key;
- senha do usuário;
- QR Code;
- código de ativação;
- propriedade do equipamento;
- cadastro comercial;
- conta do cliente;
- processo de provisioning.

O CORE recebe a telemetria e o contexto autorizado necessários à análise.

### Separação

```text
ESP32
  |
  | credencial técnica
  v
SERVER
  |
  | autentica e resolve contexto
  v
CORE
  |
  | produz inteligência
  v
PUBLIC RESPONSE
  |
  v
SAAS
  |
  | persiste / gerencia / comunica
  v
DASHBOARD
```

---

## 5. PostgreSQL V1 — estado atual

O PostgreSQL V1 já possui a entidade `device_credential`, com:

- `id`
- `device_id`
- `key_hash`
- `created_at`
- `revoked_at`

O contrato atual define `key_hash` como hash da credencial, mas não fecha neste documento o algoritmo, geração, provisioning ou ciclo de vida completo da credencial.

**Não alterar a estrutura PostgreSQL V1 durante o estudo sem uma decisão formal.**

Qualquer necessidade estrutural descoberta durante o estudo deverá ser registrada como proposta de mudança, não aplicada diretamente.

---

## 6. Questões que o estudo definitivo precisa responder

### 6.1 Geração

- Quem gera a API Key?
- É gerada na fábrica, no SaaS ou no primeiro provisionamento?
- Qual é a fonte de aleatoriedade?
- Como garantir unicidade?
- Como associar inequivocamente a credencial ao Device ID?
- A API Key pode ser regenerada?

### 6.2 Armazenamento

- Onde a credencial fica armazenada no ESP32?
- Como proteger a credencial em firmware/NVS?
- O que fica armazenado no PostgreSQL?
- Qual algoritmo de hash será usado?
- É necessário salt?
- Como evitar exposição em logs?

### 6.3 Autenticação

- Como o Server recebe a API Key?
- Header `X-API-Key` permanece como mecanismo oficial?
- Como o Server localiza o dispositivo?
- Como verifica revogação?
- Pode existir mais de uma credencial ativa por dispositivo?
- Como funciona a rotação?

### 6.4 Provisioning

- Como a API Key entra no equipamento de produção?
- É gravada durante fabricação?
- Como o processo de fábrica registra o vínculo?
- Como evitar reutilização?
- Como auditar o processo?

### 6.5 Ativação pelo cliente

- Como o cliente prova que possui legitimamente o MIQAI?
- O QR Code identifica o equipamento ou também contém segredo?
- Existe Activation Secret?
- O segredo vem na embalagem?
- É necessário lacre?
- O cliente precisa fazer login antes da ativação?
- Como impedir que alguém que apenas tenha acesso físico ao aparelho o registre em outra conta?

### 6.6 Roubo e perda

- O que acontece se o equipamento for roubado antes da ativação?
- E depois da ativação?
- Como bloquear o dispositivo?
- Como impedir reativação indevida?
- Como registrar dispositivo perdido/roubado?

### 6.7 Transferência

- Como transferir o MIQAI para outro proprietário?
- O proprietário atual precisa autorizar?
- Existe período de transferência?
- O novo proprietário precisa de uma nova credencial?
- Como preservar histórico sem misturar Tenants?

### 6.8 Reset e manutenção

- O que acontece em reset de fábrica?
- A API Key permanece?
- Pode ser substituída?
- Como técnico autorizado acessa o equipamento?
- Como evitar que manutenção resulte em tomada de posse indevida?

---

## 7. O que o estudo NÃO pode fazer

Durante o estudo:

- não alterar a metodologia do CORE;
- não alterar o pipeline do CORE;
- não colocar autenticação dentro do CORE;
- não alterar o Public Response para acomodar autenticação;
- não colocar API Key dentro do JSON de telemetria;
- não colocar API Key em `reading`;
- não criar inteligência ambiental no Server;
- não inventar regras de ownership;
- não alterar PostgreSQL V1 diretamente;
- não alterar contratos congelados apenas para facilitar uma implementação.

Se uma mudança for necessária, ela deve aparecer como:

```text
PROPOSTA DE MUDANÇA
    |
    +-- motivo
    +-- impacto
    +-- contrato afetado
    +-- alternativa considerada
    +-- decisão necessária
```

---

## 8. Resultado esperado do estudo

O estudo deverá produzir, no mínimo:

1. modelo definitivo de credenciais;
2. ciclo de vida da API Key;
3. fluxo de provisioning;
4. fluxo de ativação;
5. fluxo de autenticação Server;
6. fluxo de revogação;
7. fluxo de rotação;
8. fluxo de transferência de propriedade;
9. tratamento de roubo/perda;
10. avaliação de segurança;
11. impacto no PostgreSQL V1;
12. impacto no Server;
13. impacto no ESP32;
14. impacto no SaaS;
15. confirmação explícita de que o CORE permanece isolado.

Somente depois disso deverá ser criado um contrato definitivo de credenciais.

---

# 9. Prompt oficial para o chat dedicado

Use o prompt abaixo para abrir um chat exclusivamente sobre credenciais e autenticação do MIQAI:

---

## PROMPT — MIQAI CREDENTIALS / AUTHENTICATION / DEVICE ACTIVATION

Você é responsável por conduzir o estudo arquitetural de **credenciais, API Key, autenticação, provisioning e ativação dos dispositivos MIQAI**.

### Contexto

O MIQAI possui a arquitetura:

```text
ESP32
  ↓
MIQAI Server
  ↓
MIQAI CORE
  ↓
Public Response
  ↓
SaaS / PostgreSQL
  ↓
Dashboard
```

Princípio oficial:

> **CORE produz inteligência. JSON transporta a resposta. SaaS persiste e gerencia. Dashboard apresenta.**

O MIQAI CORE está congelado e não deve ser alterado por decisões de autenticação.

O PostgreSQL V1 também está congelado. Existe atualmente a tabela `device_credential`, contendo:

- `id`
- `device_id`
- `key_hash`
- `created_at`
- `revoked_at`

### Decisão atual do MVP

Para testes e desenvolvimento:

- a API Key será configurada manualmente no dispositivo;
- o dispositivo será previamente cadastrado/autorizado no SaaS;
- o ESP32 utilizará a API Key para comunicação com o Server;
- o Server autentica/identifica o dispositivo;
- o Server resolve o contexto autorizado;
- o CORE recebe apenas telemetria + contexto necessário;
- não será criado agora um mecanismo comercial completo de ativação.

### Objetivo do estudo

Projetar a solução definitiva para produção sem colocar a autenticação dentro do CORE.

Investigar:

1. geração de API Key;
2. unicidade;
3. provisioning de fábrica;
4. armazenamento seguro no ESP32;
5. armazenamento no backend;
6. algoritmo de hash;
7. autenticação pelo Server;
8. rotação;
9. revogação;
10. QR Code;
11. Activation Secret;
12. prova de posse;
13. ativação pelo cliente;
14. prevenção de ativação por terceiros;
15. roubo;
16. perda;
17. transferência de propriedade;
18. reset de fábrica;
19. manutenção;
20. recuperação;
21. auditoria;
22. ciclo de vida completo da credencial.

### Restrição fundamental

Não alterar o CORE para resolver autenticação.

Não adicionar ao CORE:

- API Key;
- autenticação;
- ownership;
- usuário;
- senha;
- QR Code;
- activation code;
- regras comerciais.

O CORE deve continuar recebendo contexto autorizado pelo Server.

### Outra restrição fundamental

Não modificar diretamente o PostgreSQL V1.

Se o estudo identificar necessidade de mudança estrutural, registrar:

- problema;
- motivo;
- impacto;
- proposta;
- alternativa;
- compatibilidade;
- necessidade de migration;
- decisão pendente.

### Pergunta central

Precisamos chegar a uma resposta objetiva para:

> **Como um MIQAI sai da fábrica com uma identidade única, chega ao cliente, é legitimamente ativado pelo proprietário, passa a enviar telemetria autenticada e pode ser revogado, transferido ou recuperado, sem alterar a responsabilidade do CORE?**

### Não assumir previamente

Não assumir que:

- API Key deve ser mostrada ao cliente;
- QR Code deve conter a API Key;
- QR Code deve conter um segredo;
- a chave deve obrigatoriamente ser gerada na fábrica;
- SHA-256 é necessariamente a solução final;
- um único credential por dispositivo é obrigatório;
- o SaaS deve ou não gerar a credencial.

Compare alternativas antes de concluir.

### Entregáveis

Produza:

1. arquitetura recomendada;
2. alternativas consideradas;
3. matriz de riscos;
4. fluxo de fábrica;
5. fluxo de ativação;
6. fluxo de operação;
7. fluxo de revogação;
8. fluxo de transferência;
9. fluxo de roubo/perda;
10. fluxo de reset;
11. modelo de credenciais;
12. responsabilidades ESP32 / Server / SaaS / CORE;
13. impacto no PostgreSQL;
14. impacto nos contratos atuais;
15. proposta de contrato `MIQAI_DEVICE_CREDENTIAL_V1`, somente depois da decisão arquitetural.

Não implemente código antes de fechar a arquitetura.

---

## 10. Regra de governança

A sequência correta é:

```text
ESTUDO
  ↓
ALTERNATIVAS
  ↓
DECISÃO ARQUITETURAL
  ↓
CONTRATO
  ↓
IMPACTO NOS SISTEMAS
  ↓
IMPLEMENTAÇÃO
  ↓
TESTES
  ↓
APROVAÇÃO
```

Nunca:

```text
CÓDIGO
  ↓
descobrir arquitetura depois
```

---

## 11. Estado atual

**MVP/Testes:** aprovado para seguir com API Key configurada manualmente.

**Autenticação definitiva:** em estudo separado.

**CORE:** congelado.

**Public Response:** congelado.

**PostgreSQL V1:** congelado.

**Objetivo imediato:** continuar os testes ponta a ponta do MIQAI sem bloquear o projeto pela definição de provisioning/ownership.
