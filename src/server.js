/**
 * ======================================================================
 * CORE QAI
 * Server
 * ----------------------------------------------------------------------
 * API Oficial de Integração
 * ----------------------------------------------------------------------
 * Responsabilidades
 * ----------------------------------------------------------------------
 * - Receber a requisição do Client
 * - Identificar o dispositivo
 * - Consultar o Device Registry
 * - Validar o status operacional
 * - Buscar a última telemetria
 * - Mapear a telemetria para o contrato do CORE
 * - Normalizar o tipo de ambiente
 * - Executar a API pública do CORE QAI
 * - Devolver a resposta à mesma requisição HTTP
 *
 * Este módulo NÃO:
 * - executa cálculos ambientais;
 * - resolve Domains;
 * - executa regras do CORE;
 * - interpreta referências;
 * - produz diagnóstico;
 * - produz métricas.
 * ======================================================================
 */

import "dotenv/config";
import http from "http";

import mapInput from "./mappers/inputMapper.js";
import mapOutput from "./mappers/outputMapper.js";
import SupabaseProvider from "./providers/supabaseProvider.js";

import AnalisarQualidadeAmbiental from "core-qai";


const PORT =
    process.env.PORT ?? 3000;

const DEBUG =
    process.env.DEBUG === "true";

const provider =
    new SupabaseProvider();


/* ======================================================================
 * ENVIRONMENT MAP
 * ----------------------------------------------------------------------
 * Converte o código utilizado pelo Device Registry/SaaS para o
 * identificador de ambiente aceito pela API pública do CORE.
 *
 * IMPORTANTE:
 * Isto NÃO resolve Domains.
 *
 * Exemplo:
 *
 * OFFICE
 *    ↓
 * "corporate"
 *
 * O Domain continua sendo responsabilidade exclusiva do CORE.
 * ====================================================================== */

const ENVIRONMENT_MAP = Object.freeze({

    OFFICE: "corporate",

    HOTEL: "corporate",

    SCHOOL: "education",

    CLINIC: "healthcare",

    HOSPITAL: "healthcare",

    CONSULTING_ROOM: "healthcare",

    RESIDENTIAL: "residential",

    DATACENTER: "datacenter"

});


/* ======================================================================
 * SERVER
 * ====================================================================== */

const server =
    http.createServer(async (req, res) => {

        /* ==============================================================
         * CORS
         * ============================================================== */

        res.setHeader(
            "Access-Control-Allow-Origin",
            "*"
        );

        res.setHeader(
            "Access-Control-Allow-Methods",
            "GET, POST, OPTIONS"
        );

        res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type"
        );


        /* ==============================================================
         * OPTIONS
         * ============================================================== */

        if (req.method === "OPTIONS") {

            res.writeHead(204);

            return res.end();

        }


        try {

            /* ==========================================================
             * REQUEST
             * ----------------------------------------------------------
             * Exemplo:
             *
             * GET /?deviceId=10
             * ========================================================== */

            const url =
                new URL(
                    req.url,
                    `http://${req.headers.host}`
                );


            const deviceId =
                url.searchParams.get("deviceId");


            /* ==========================================================
             * DEVICE ID
             * ========================================================== */

            if (!deviceId) {

                res.writeHead(400, {

                    "Content-Type":
                        "application/json"

                });

                return res.end(
                    JSON.stringify({

                        error:
                            "Parâmetro deviceId é obrigatório."

                    }, null, 2)
                );

            }


            /* ==========================================================
             * DEVICE REGISTRY
             * ========================================================== */

            const device =
                await provider.getDevice(
                    deviceId
                );


            if (!device) {

                res.writeHead(404, {

                    "Content-Type":
                        "application/json"

                });

                return res.end(
                    JSON.stringify({

                        error:
                            "Dispositivo não encontrado."

                    }, null, 2)
                );

            }


            /* ==========================================================
             * DEVICE STATUS
             * ----------------------------------------------------------
             * Somente dispositivos ativos podem gerar análise.
             * ========================================================== */

            if (
                String(
                    device.status ?? ""
                ).toUpperCase() !== "ACTIVE"
            ) {

                res.writeHead(403, {

                    "Content-Type":
                        "application/json"

                });

                return res.end(
                    JSON.stringify({

                        error:
                            "Dispositivo não está ativo.",

                        deviceId:
                            device.device_id,

                        status:
                            device.status ?? null

                    }, null, 2)
                );

            }


            /* ==========================================================
             * ENVIRONMENT TYPE
             * ========================================================== */

            if (!device.environment_type) {

                res.writeHead(400, {

                    "Content-Type":
                        "application/json"

                });

                return res.end(
                    JSON.stringify({

                        error:
                            "Dispositivo sem environment_type cadastrado.",

                        deviceId:
                            device.device_id

                    }, null, 2)
                );

            }


            /* ==========================================================
             * NORMALIZE ENVIRONMENT
             * ========================================================== */

            const environmentType =
                String(
                    device.environment_type
                )
                    .trim()
                    .toUpperCase();


            const environment =
                ENVIRONMENT_MAP[
                    environmentType
                ];


            if (!environment) {

                res.writeHead(400, {

                    "Content-Type":
                        "application/json"

                });

                return res.end(
                    JSON.stringify({

                        error:
                            `Environment Type não suportado: ${environmentType}`,

                        deviceId:
                            device.device_id

                    }, null, 2)
                );

            }


            /* ==========================================================
             * LATEST READING
             * ========================================================== */

            const reading =
                await provider.getLatestReading(
                    device.device_id
                );


            if (!reading) {

                res.writeHead(404, {

                    "Content-Type":
                        "application/json"

                });

                return res.end(
                    JSON.stringify({

                        error:
                            "Nenhuma leitura encontrada."

                    }, null, 2)
                );

            }


            /* ==========================================================
             * INPUT MAPPER
             * ----------------------------------------------------------
             * O Mapper preserva:
             *
             * - parâmetros ambientais;
             * - PM1 / PM2.5 / PM4 / PM10;
             * - contagem de partículas;
             * - tamanho típico;
             * - VOC;
             * - NOx.
             *
             * Battery, signalStrength, luminosity e noise não fazem
             * parte do payload analítico do CORE.
             * ========================================================== */

            const rawReading =
                mapInput(reading);


            if (!rawReading) {

                throw new Error(
                    "Falha ao converter telemetria."
                );

            }


            /* ==========================================================
             * DEBUG
             * ========================================================== */

            if (DEBUG) {

                console.log("");
                console.log(
                    "========== DEVICE =========="
                );

                console.log(device);

                console.log(
                    "============================"
                );


                console.log("");
                console.log(
                    "========= READING =========="
                );

                console.log(reading);

                console.log(
                    "============================"
                );


                console.log("");
                console.log(
                    "======= ENVIRONMENT ========"
                );

                console.log({

                    original:
                        device.environment_type,

                    normalized:
                        environment

                });

                console.log(
                    "============================"
                );


                console.log("");
                console.log(
                    "======== CORE INPUT ========"
                );

                console.log({

                    reading:
                        rawReading,

                    environment

                });

                console.log(
                    "============================"
                );

            }


            /* ==========================================================
             * CORE QAI
             * ----------------------------------------------------------
             * API pública oficial do CORE.
             *
             * O Server NÃO:
             *
             * - acessa Domains;
             * - executa Pipeline;
             * - calcula métricas;
             * - interpreta diagnóstico;
             * - resolve referências.
             *
             * Apenas envia o contrato oficial.
             * ========================================================== */

            const resultado =
                AnalisarQualidadeAmbiental({

                    reading:
                        rawReading,

                    environment

                });


            /* ==========================================================
             * RESPONSE
             * ----------------------------------------------------------
             * A resposta produzida pelo CORE é devolvida diretamente
             * à requisição HTTP que originou a análise.
             * ========================================================== */

            res.writeHead(200, {
                "Content-Type": "application/json; charset=utf-8"
            });


            const payload =
                mapOutput(
                    device,
                    reading,
                    resultado
                );

                res.end(
                    JSON.stringify(
                        payload,
                        null,
                        2
                    )
                );


        }

        /* ==============================================================
         * ERROR
         * ============================================================== */

        catch (err) {

            console.error(err);


            res.writeHead(500, {

                "Content-Type":
                    "application/json"

            });


            res.end(
                JSON.stringify({

                    error:
                        err.message

                }, null, 2)
            );

        }

    });


/* ======================================================================
 * SERVER START
 * ====================================================================== */

server.listen(
    PORT,
    () => {

        console.log("");

        console.log(
            "=================================="
        );

        console.log(
            " CORE QAI SERVER ONLINE"
        );

        console.log(
            "=================================="
        );

        console.log(
            `Port: ${PORT}`
        );

        console.log(
            `Debug: ${DEBUG}`
        );

        console.log("");

    }
);
