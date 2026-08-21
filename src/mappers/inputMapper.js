/**
 * ======================================================================
 * CORE QAI
 * Input Mapper
 * ----------------------------------------------------------------------
 * Função:
 * Converter a telemetria persistida pelo SaaS para o contrato oficial
 * de entrada do MIQAI_CORE.
 *
 * O Mapper NÃO:
 * - interpreta parâmetros;
 * - aplica regras;
 * - calcula métricas;
 * - classifica valores.
 *
 * Apenas adapta o formato da telemetria ao contrato do CORE.
 * ======================================================================
 */

function toNullableNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : null;

}


export default function mapInput(row) {

    if (!row) {

        return null;

    }

    return {

        /* ==============================================================
         * CONFORTO TÉRMICO
         * ============================================================== */

        temperature:
            toNullableNumber(
                row.temperature
            ),

        humidity:
            toNullableNumber(
                row.humidity
            ),


        /* ==============================================================
         * GASES
         * ============================================================== */

        co2:
            toNullableNumber(
                row.co2
            ),

        vocIndex:
            toNullableNumber(
                row.vocIndex
            ),

        noxIndex:
            toNullableNumber(
                row.noxIndex
            ),


        /* ==============================================================
         * MATERIAL PARTICULADO
         * --------------------------------------------------------------
         * Nomes preservados conforme contrato oficial do CORE.
         * ============================================================== */

        pm1_0:
            toNullableNumber(
                row.pm1_0
            ),

        pm25:
            toNullableNumber(
                row.pm25
            ),

        pm4_0:
            toNullableNumber(
                row.pm4_0
            ),

        pm10:
            toNullableNumber(
                row.pm10
            ),


        /* ==============================================================
         * CONTAGEM DE PARTÍCULAS
         * ============================================================== */

        nc0_5:
            toNullableNumber(
                row.nc0_5
            ),

        nc1_0:
            toNullableNumber(
                row.nc1_0
            ),

        nc2_5:
            toNullableNumber(
                row.nc2_5
            ),

        nc4_0:
            toNullableNumber(
                row.nc4_0
            ),

        nc10_0:
            toNullableNumber(
                row.nc10_0
            ),


        /* ==============================================================
         * SENSOR
         * ============================================================== */

        typicalSize:
            toNullableNumber(
                row.typicalSize
            )

    };

}