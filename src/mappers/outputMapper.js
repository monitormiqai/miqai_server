/**
 * ======================================================================
 * CORE QAI
 * Output Mapper
 * ----------------------------------------------------------------------
 * Arquivo : mappers/outputMapper.js
 * Função  : Construir o contrato JSON de consumo do SaaS / Client
 * Versão  : RC1
 *
 * Responsabilidades
 * ----------------------------------------------------------------------
 * - Preservar a identificação do dispositivo;
 * - Preservar a telemetria original persistida;
 * - Encapsular a resposta oficial do MIQAI_CORE;
 * - Entregar um contrato único para o SaaS / Reference Client.
 *
 * Este módulo NÃO:
 * ----------------------------------------------------------------------
 * - calcula métricas;
 * - interpreta parâmetros;
 * - aplica regras ambientais;
 * - resolve Domains;
 * - altera a resposta do CORE;
 * - cria diagnósticos;
 * - cria classificações.
 *
 * Arquitetura:
 *
 *     Supabase Reading
 *             +
 *       CORE Response
 *             ↓
 *        Output Mapper
 *             ↓
 *       SaaS JSON Contract
 * ======================================================================
 */


/* ======================================================================
 * OUTPUT MAPPER
 * ====================================================================== */

export default function mapOutput(
    device,
    reading,
    analysis
) {

    if (!device) {

        throw new Error(
            "Device é obrigatório para construir a resposta."
        );

    }

    if (!reading) {

        throw new Error(
            "Reading é obrigatório para construir a resposta."
        );

    }

    if (!analysis) {

        throw new Error(
            "Analysis é obrigatório para construir a resposta."
        );

    }


    return {

        /* ==============================================================
         * DEVICE
         * ============================================================== */

        device: {

            deviceId:
                device.device_id ?? null

        },


        /* ==============================================================
         * TELEMETRY
         * --------------------------------------------------------------
         * Dados provenientes da persistência do SaaS.
         *
         * Nenhum valor é reinterpretado pelo Mapper.
         * ============================================================== */

        telemetry: {

            timestamp:
                reading.created_at ?? null,

            temperature:
                reading.temperature ?? null,

            humidity:
                reading.humidity ?? null,

            co2:
                reading.co2 ?? null,

            pm1_0:
                reading.pm1_0 ?? null,

            pm25:
                reading.pm25 ?? null,

            pm4_0:
                reading.pm4_0 ?? null,

            pm10:
                reading.pm10 ?? null,

            nc0_5:
                reading.nc0_5 ?? null,

            nc1_0:
                reading.nc1_0 ?? null,

            nc2_5:
                reading.nc2_5 ?? null,

            nc4_0:
                reading.nc4_0 ?? null,

            nc10_0:
                reading.nc10_0 ?? null,

            vocIndex:
                reading.vocIndex ?? null,

            noxIndex:
                reading.noxIndex ?? null,

            typicalSize:
                reading.typicalSize ?? null,

            signalStrength:
                reading.signalStrength ?? null

        },


        /* ==============================================================
         * ANALYSIS
         * --------------------------------------------------------------
         * Resposta oficial produzida pelo MIQAI_CORE.
         *
         * O objeto é preservado integralmente.
         * ============================================================== */

        analysis

    };

}