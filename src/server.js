/**
 * ======================================================================
 * MIQAI CORE QAI
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
 * - Adaptar o resultado para o Public Response V1
 * - Devolver a resposta HTTP
 *
 * Este módulo NÃO:
 * - executa cálculos ambientais;
 * - resolve Domains;
 * - executa regras do CORE;
 * - interpreta referências;
 * - produz diagnóstico;
 * - produz métricas;
 * - cria inteligência própria.
 * ======================================================================
 */

import "dotenv/config";
import http from "http";

import mapInput from "./mappers/inputMapper.js";
import SupabaseProvider from "./providers/supabaseProvider.js";

import AnalisarQualidadeAmbiental from "core-qai";
import adaptPublicResponse from "core-qai/public-response";


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
 * Isto NÃO resolve Domains.
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
             * ============================================================== */

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
             * Converte a telemetria do Supabase para o contrato de
             * entrada utilizado pelo CORE.
             *
             * O Server não interpreta os parâmetros.
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
             * O Server apenas fornece os dados.
             *
             * Toda a inteligência permanece no CORE.
             * ========================================================== */

            const resultado =
                AnalisarQualidadeAmbiental({

                    reading:
                        rawReading,

                    environment

                });


            /* ==========================================================
             * PUBLIC RESPONSE V1
             * ----------------------------------------------------------
             * O próprio CORE converte o resultado interno para o
             * contrato público destinado aos consumidores externos.
             *
             * O Server NÃO reconstrói esse contrato.
             * ========================================================== */

            const payload =
                adaptPublicResponse(
                    resultado
                );


            /* ==========================================================
             * HTTP RESPONSE
             * ========================================================== */

            res.writeHead(200, {

                "Content-Type":
                    "application/json; charset=utf-8"

            });


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
                    "application/json; charset=utf-8"

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
            " MIQAI CORE QAI SERVER ONLINE"
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