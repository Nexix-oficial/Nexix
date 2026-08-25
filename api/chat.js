
const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");

require("dotenv").config();

const app = express();

// ==========================================
// AUTENTICACIÓN
// ==========================================

const authRouter = require("./auth");

// ==========================================
// CONFIGURACIÓN
// ==========================================

app.use(cors());

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "nexix-development-secret-change-this",

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge:
                1000 *
                60 *
                60 *
                24 *
                7
        }
    })
);

app.use(
    express.json({
        limit: "20mb"
    })
);

// ==========================================
// RUTAS DE AUTENTICACIÓN
// ==========================================

app.use(
    "/api/auth",
    authRouter
);

// ==========================================
// ARCHIVOS DE LA WEB
// ==========================================

app.use(
    express.static(
        path.join(__dirname, "..")
    )
);

// ==========================================
// OPENROUTER
// ==========================================

const OPENROUTER_API_KEY =
    process.env.OPENROUTER_API_KEY;

const OPENROUTER_MODEL =
    process.env.OPENROUTER_MODEL ||
    "openrouter/free";

// ==========================================
// CLOUDFLARE
// ==========================================

const CLOUDFLARE_ACCOUNT_ID =
    process.env.CLOUDFLARE_ACCOUNT_ID;

const CLOUDFLARE_API_TOKEN =
    process.env.CLOUDFLARE_API_TOKEN;

// ==========================================
// MEMORIA
// ==========================================

let conversationHistory = [];

// ==========================================
// COMPROBAR CONFIGURACIÓN
// ==========================================

if (!OPENROUTER_API_KEY) {
    console.error(
        "❌ Falta OPENROUTER_API_KEY en .env"
    );
}

if (!CLOUDFLARE_ACCOUNT_ID) {
    console.error(
        "⚠️ Falta CLOUDFLARE_ACCOUNT_ID en .env"
    );
}

if (!CLOUDFLARE_API_TOKEN) {
    console.error(
        "⚠️ Falta CLOUDFLARE_API_TOKEN en .env"
    );
}

if (!process.env.TURNSTILE_SECRET_KEY) {
    console.error(
        "⚠️ Falta TURNSTILE_SECRET_KEY en .env"
    );
}

if (!process.env.SESSION_SECRET) {
    console.warn(
        "⚠️ Falta SESSION_SECRET en .env. " +
        "Se está usando una clave temporal de desarrollo."
    );
}

// ==========================================
// PERSONALIDAD DE NEXIX
// ==========================================

const systemInstruction = `
Eres NEXIX AI.

Eres un asistente inteligente, rápido, amable y natural.

Mantén el contexto de la conversación.

Si el usuario hace una pregunta relacionada con algo
que se habló anteriormente, utiliza ese contexto.

Responde en español salvo que el usuario pida otro idioma.

Puedes utilizar emojis cuando sean apropiados.

Utiliza Markdown cuando ayude a entender la respuesta.

Responde de forma clara, natural y útil.
`;

// ==========================================
// GENERAR IMAGEN CON CLOUDFLARE
// ==========================================

async function generateImage(prompt) {

    const url =
        "https://api.cloudflare.com/client/v4/accounts/" +
        CLOUDFLARE_ACCOUNT_ID +
        "/ai/run/@cf/black-forest-labs/flux-1-schnell";

    const response =
        await fetch(
            url,
            {
                method: "POST",

                headers: {
                    "Authorization":
                        "Bearer " +
                        CLOUDFLARE_API_TOKEN,

                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    prompt: prompt,
                    steps: 4
                })
            }
        );

    const data =
        await response.json();

    if (
        !response.ok ||
        !data.success
    ) {

        console.error(
            "❌ Error de Cloudflare:",
            JSON.stringify(
                data,
                null,
                2
            )
        );

        throw new Error(
            data.errors &&
            data.errors[0] &&
            data.errors[0].message
                ? data.errors[0].message
                : "Cloudflare no pudo generar la imagen."
        );
    }

    if (
        !data.result ||
        !data.result.image
    ) {

        throw new Error(
            "Cloudflare no devolvió la imagen."
        );
    }

    return data.result.image;
}

// ==========================================
// DETECTAR PETICIÓN DE IMAGEN
// ==========================================

function isImageRequest(message) {

    const text =
        message
            .trim()
            .toLowerCase();

    const tieneAccion =
        /\b(genera|generar|crea|crear|hazme|haz|dibuja|dibujar)\b/i
            .test(text);

    const tieneTipo =
        /\b(imagen|foto|ilustración|ilustracion|dibujo)\b/i
            .test(text);

    if (
        tieneAccion &&
        tieneTipo
    ) {
        return true;
    }

    if (
        text.startsWith("imagen:") ||
        text.startsWith("foto:") ||
        text.startsWith("dibujo:") ||
        text.startsWith("ilustración:") ||
        text.startsWith("ilustracion:")
    ) {
        return true;
    }

    return false;
}

// ==========================================
// CHAT
// ==========================================

app.post(
    "/api/chat",
    async (req, res) => {

        try {

            const message =
                req.body.message;

            if (
                !message ||
                !message.trim()
            ) {

                return res.status(400).json({
                    error:
                        "No se recibió ningún mensaje."
                });
            }

            console.log(
                "📩 Usuario:",
                message
            );

            // ==================================
            // IMAGEN → CLOUDFLARE
            // ==================================

            if (
                isImageRequest(message)
            ) {

                console.log(
                    "🎨 Generando imagen con Cloudflare..."
                );

                const image =
                    await generateImage(
                        message
                    );

                return res.json({

                    type: "image",

                    response:
                        "🎨 Aquí tienes la imagen que me has pedido.",

                    image: {
                        data: image,
                        mimeType:
                            "image/jpeg"
                    }

                });
            }

            // ==================================
            // GUARDAR MENSAJE
            // ==================================

            conversationHistory.push({

                role: "user",

                content: message

            });

            if (
                conversationHistory.length > 20
            ) {

                conversationHistory =
                    conversationHistory.slice(
                        -20
                    );
            }

            // ==================================
            // MENSAJES PARA OPENROUTER
            // ==================================

            const messages = [

                {
                    role: "system",

                    content:
                        systemInstruction
                },

                ...conversationHistory

            ];

            // ==================================
            // OPENROUTER
            // ==================================

            console.log(
                "🤖 Preguntando a OpenRouter..."
            );

            const response =
                await fetch(
                    "https://openrouter.ai/api/v1/chat/completions",
                    {

                        method: "POST",

                        headers: {

                            "Authorization":
                                "Bearer " +
                                OPENROUTER_API_KEY,

                            "Content-Type":
                                "application/json",

                            "HTTP-Referer":
                                "http://localhost:3000",

                            "X-Title":
                                "NEXIX AI"

                        },

                        body: JSON.stringify({

                            model:
                                OPENROUTER_MODEL,

                            messages:
                                messages

                        })

                    }
                );

            // ==================================
            // ERROR OPENROUTER
            // ==================================

            if (
                !response.ok
            ) {

                const errorText =
                    await response.text();

                console.error(
                    "❌ ERROR OPENROUTER:",
                    errorText
                );

                return res.status(500).json({

                    error:
                        "Error de OpenRouter.",

                    details:
                        errorText

                });
            }

            // ==================================
            // RESPUESTA
            // ==================================

            const data =
                await response.json();

            const answer =
                data.choices &&
                data.choices[0] &&
                data.choices[0].message &&
                data.choices[0].message.content
                    ? data.choices[0].message.content
                    : null;

            if (!answer) {

                console.error(
                    "❌ OpenRouter no devolvió texto:",
                    JSON.stringify(
                        data,
                        null,
                        2
                    )
                );

                return res.status(500).json({

                    error:
                        "OpenRouter no devolvió ninguna respuesta."

                });
            }

            // ==================================
            // GUARDAR RESPUESTA
            // ==================================

            conversationHistory.push({

                role: "assistant",

                content: answer

            });

            console.log(
                "✅ Respuesta recibida."
            );

            // ==================================
            // ENVIAR AL FRONTEND
            // ==================================

            return res.json({

                type: "text",

                response: answer

            });

        } catch (error) {

            console.error("");
            console.error(
                "=============================="
            );
            console.error(
                "❌ ERROR DE NEXIX"
            );
            console.error(
                "=============================="
            );
            console.error(error);
            console.error(
                "=============================="
            );

            return res.status(500).json({

                error:
                    "NEXIX ha encontrado un error.",

                details:
                    error.message

            });
        }
    }
);

// ==========================================
// NUEVO CHAT
// ==========================================

app.post(
    "/api/new-chat",
    (req, res) => {

        conversationHistory = [];

        console.log(
            "🧹 Memoria de NEXIX borrada."
        );

        res.json({

            success: true,

            message:
                "Nuevo chat iniciado."

        });
    }
);

// ==========================================
// SERVIDOR
// ==========================================

const PORT =
    process.env.PORT || 3000;

app.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "=============================="
        );
        console.log(
            "       NEXIX AI INICIADO"
        );
        console.log(
            "=============================="
        );
        console.log("");

        console.log(
            "🌐 Web: http://localhost:" +
            PORT
        );

        console.log(
            "🤖 Modelo: " +
            OPENROUTER_MODEL
        );

        console.log(
            "🧠 Memoria: ACTIVADA"
        );

        console.log(
            "🎨 Imágenes: CLOUDFLARE"
        );

        console.log(
            "🔐 Autenticación: ACTIVADA"
        );

        console.log("");
    }
);

