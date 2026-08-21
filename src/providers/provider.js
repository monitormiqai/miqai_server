/**
 * ======================================================================
 * CORE QAI
 * Provider Interface
 * ----------------------------------------------------------------------
 * Arquivo : provider.js
 * Módulo  : Server
 * Versão  : 2.0.0
 *
 * Objetivo
 * ----------------------------------------------------------------------
 * Contrato para provedores de dados do CORE.
 *
 * O Provider é responsável por fornecer:
 *
 *  • Cadastro do dispositivo
 *  • Última telemetria disponível
 *
 * A implementação concreta poderá utilizar:
 *
 *  • Supabase
 *  • PostgreSQL
 *  • SQL Server
 *  • MySQL
 *  • Azure
 *  • Mock
 *
 * O CORE nunca acessa banco diretamente.
 * ======================================================================
 */

export default class Provider {

    /**
     * Retorna o cadastro do dispositivo.
     *
     * @param {string} deviceId
     * @returns {Promise<Object>}
     */
    async getDevice(deviceId) {

        throw new Error(
            "getDevice() not implemented."
        );

    }

    /**
     * Retorna a última telemetria disponível.
     *
     * @param {string} deviceId
     * @returns {Promise<Object>}
     */
    async getLatestReading(deviceId) {

        throw new Error(
            "getLatestReading() not implemented."
        );

    }

}