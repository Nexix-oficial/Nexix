const express = require("express");
const bcrypt = require("bcrypt");
const Database = require("better-sqlite3");
const crypto = require("crypto");
const path = require("path");
const { OAuth2Client } = require("google-auth-library");

require("dotenv").config();

const router = express.Router();

/* ==========================================
   GOOGLE OAUTH
========================================== */

const GOOGLE_CLIENT_ID =
    process.env.GOOGLE_CLIENT_ID;

const GOOGLE_CLIENT_SECRET =
    process.env.GOOGLE_CLIENT_SECRET;

const GOOGLE_CALLBACK_URL =
    process.env.GOOGLE_CALLBACK_URL ||
    "http://localhost:3000/api/auth/google/callback";

const googleClient =
    new OAuth2Client(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_CALLBACK_URL
    );


/* ==========================================
   BASE DE DATOS
========================================== */

const db = new Database(
    path.join(__dirname, "..", "nexix.db")
);

db.pragma("journal_mode = WAL");


/* ==========================================
   TABLA DE USUARIOS
========================================== */

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email_verified INTEGER DEFAULT 0,
        verification_token TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);


/* ==========================================
   CLOUDFLARE TURNSTILE
========================================== */

const TURNSTILE_SECRET_KEY =
    process.env.TURNSTILE_SECRET_KEY;


/* ==========================================
   VALIDAR TURNSTILE
========================================== */

async function verifyTurnstile(token) {

    if (!TURNSTILE_SECRET_KEY) {
        throw new Error(
            "Falta TURNSTILE_SECRET_KEY en .env"
        );
    }

    if (!token) {
        return false;
    }

    const response = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded"
            },

            body: new URLSearchParams({
                secret:
                    TURNSTILE_SECRET_KEY,

                response:
                    token
            })
        }
    );

    const data =
        await response.json();

    return data.success === true;
}


/* ==========================================
   GOOGLE — INICIAR AUTENTICACIÓN
========================================== */

router.get(
    "/google",
    (req, res) => {

        if (
            !GOOGLE_CLIENT_ID ||
            !GOOGLE_CLIENT_SECRET
        ) {

            return res.redirect(
                "/login.html?error=google_config"
            );
        }

        const authorizationUrl =
            googleClient.generateAuthUrl({

                access_type: "offline",

                scope: [
                    "openid",
                    "email",
                    "profile"
                ],

                prompt: "select_account"
            });

        res.redirect(
            authorizationUrl
        );
    }
);


/* ==========================================
   GOOGLE — CALLBACK
========================================== */

router.get(
    "/google/callback",
    async (req, res) => {

        try {

            const code =
                req.query.code;


            if (!code) {

                return res.redirect(
                    "/login.html?error=google"
                );
            }


            const { tokens } =
                await googleClient.getToken(
                    code
                );


            if (!tokens.id_token) {

                return res.redirect(
                    "/login.html?error=google"
                );
            }


            const ticket =
                await googleClient.verifyIdToken({
                    idToken:
                        tokens.id_token,

                    audience:
                        GOOGLE_CLIENT_ID
                });


            const payload =
                ticket.getPayload();


            if (!payload) {

                return res.redirect(
                    "/login.html?error=google"
                );
            }


            const googleId =
                payload.sub;


            const email =
                payload.email
                    ? payload.email
                        .trim()
                        .toLowerCase()
                    : null;


            const name =
                payload.name ||
                "Usuario NEXIX";


            const picture =
                payload.picture ||
                null;


            if (
                !googleId ||
                !email
            ) {

                return res.redirect(
                    "/login.html?error=google"
                );
            }


            /* ==================================
               BUSCAR USUARIO
            ================================== */

            let user =
                db.prepare(`
                    SELECT
                        id,
                        email,
                        password_hash,
                        email_verified
                    FROM users
                    WHERE email = ?
                `).get(
                    email
                );


            /* ==================================
               CREAR USUARIO GOOGLE
            ================================== */

            if (!user) {

                const randomPassword =
                    crypto
                        .randomBytes(32)
                        .toString("hex");


                const passwordHash =
                    await bcrypt.hash(
                        randomPassword,
                        12
                    );


                const result =
                    db.prepare(`
                        INSERT INTO users (
                            email,
                            password_hash,
                            email_verified,
                            verification_token
                        )
                        VALUES (?, ?, 1, NULL)
                    `).run(
                        email,
                        passwordHash
                    );


                user = {

                    id:
                        result.lastInsertRowid,

                    email:
                        email,

                    password_hash:
                        passwordHash,

                    email_verified:
                        1
                };


                console.log(
                    "👤 Cuenta Google creada:",
                    email
                );

            } else {

                console.log(
                    "🔐 Inicio de sesión Google:",
                    email
                );


                /* ==============================
                   GOOGLE YA VERIFICÓ EL EMAIL
                ============================== */

                if (
                    user.email_verified !== 1
                ) {

                    db.prepare(`
                        UPDATE users
                        SET
                            email_verified = 1,
                            verification_token = NULL
                        WHERE id = ?
                    `).run(
                        user.id
                    );

                }

            }


            /* ==================================
               CREAR SESIÓN NUEVA
            ================================== */

            req.session.regenerate(
                (sessionError) => {

                    if (sessionError) {

                        console.error(
                            "❌ ERROR REGENERANDO SESIÓN GOOGLE:",
                            sessionError
                        );

                        return res.redirect(
                            "/login.html?error=session"
                        );
                    }


                    req.session.userId =
                        user.id;

                    req.session.email =
                        user.email;

                    req.session.authProvider =
                        "google";

                    req.session.name =
                        name;

                    req.session.picture =
                        picture;


                    /* ==============================
                       GUARDAR SESIÓN
                    ============================== */

                    req.session.save(
                        (saveError) => {

                            if (saveError) {

                                console.error(
                                    "❌ ERROR GUARDANDO SESIÓN GOOGLE:",
                                    saveError
                                );

                                return res.redirect(
                                    "/login.html?error=session"
                                );
                            }


                            console.log(
                                "✅ Sesión Google creada:",
                                user.email
                            );


                            /* ==============================
                               IR AL CHAT
                            ============================== */

                            return res.redirect(
                                "/chat.html"
                            );

                        }
                    );

                }
            );

        } catch (error) {

            console.error(
                "❌ ERROR GOOGLE OAUTH:",
                error
            );


            /* ==============================
               NO MOSTRAR PANTALLA DE ERROR
            ============================== */

            return res.redirect(
                "/login.html?error=google"
            );
        }

    }
);


/* ==========================================
   REGISTRO
========================================== */

router.post(
    "/register",
    async (req, res) => {

        try {

            const {
                email,
                password,
                turnstileToken
            } = req.body;


            if (
                !email ||
                !password ||
                !turnstileToken
            ) {

                return res.status(400).json({
                    error:
                        "Completa todos los campos y la verificación."
                });
            }


            const normalizedEmail =
                email
                    .trim()
                    .toLowerCase();


            const emailRegex =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (
                !emailRegex.test(
                    normalizedEmail
                )
            ) {

                return res.status(400).json({
                    error:
                        "Introduce un correo electrónico válido."
                });
            }


            if (
                password.length < 8
            ) {

                return res.status(400).json({
                    error:
                        "La contraseña debe tener al menos 8 caracteres."
                });
            }


            const captchaOK =
                await verifyTurnstile(
                    turnstileToken
                );


            if (!captchaOK) {

                return res.status(403).json({
                    error:
                        "La verificación de seguridad no es válida."
                });
            }


            const existingUser =
                db.prepare(`
                    SELECT id
                    FROM users
                    WHERE email = ?
                `).get(
                    normalizedEmail
                );


            if (existingUser) {

                return res.status(409).json({
                    error:
                        "Ya existe una cuenta con ese correo."
                });
            }


            const passwordHash =
                await bcrypt.hash(
                    password,
                    12
                );


            const verificationToken =
                crypto
                    .randomBytes(32)
                    .toString("hex");


            const result =
                db.prepare(`
                    INSERT INTO users (
                        email,
                        password_hash,
                        email_verified,
                        verification_token
                    )
                    VALUES (?, ?, 0, ?)
                `).run(
                    normalizedEmail,
                    passwordHash,
                    verificationToken
                );


            console.log(
                "👤 Usuario creado:",
                normalizedEmail
            );


            return res.status(201).json({

                success:
                    true,

                message:
                    "Cuenta creada correctamente.",

                userId:
                    result.lastInsertRowid

            });

        } catch (error) {

            console.error(
                "❌ ERROR REGISTRO:",
                error
            );


            return res.status(500).json({
                error:
                    "No se pudo crear la cuenta."
            });
        }

    }
);


/* ==========================================
   LOGIN MANUAL — CORREO + CONTRASEÑA
========================================== */

router.post(
    "/login",
    async (req, res) => {

        try {

            const {
                email,
                password,
                turnstileToken
            } = req.body;


            /* ==================================
               COMPROBAR DATOS
            ================================== */

            if (
                !email ||
                !password ||
                !turnstileToken
            ) {

                return res.status(400).json({
                    error:
                        "Completa todos los campos y la verificación."
                });
            }


            /* ==================================
               NORMALIZAR EMAIL
            ================================== */

            const normalizedEmail =
                email
                    .trim()
                    .toLowerCase();


            /* ==================================
               TURNSTILE
            ================================== */

            const captchaOK =
                await verifyTurnstile(
                    turnstileToken
                );


            if (!captchaOK) {

                return res.status(403).json({
                    error:
                        "La verificación de seguridad no es válida."
                });
            }


            /* ==================================
               BUSCAR USUARIO
            ================================== */

            const user =
                db.prepare(`
                    SELECT
                        id,
                        email,
                        password_hash,
                        email_verified
                    FROM users
                    WHERE email = ?
                `).get(
                    normalizedEmail
                );


            if (!user) {

                return res.status(401).json({
                    error:
                        "El correo o la contraseña no son correctos."
                });
            }


            /* ==================================
               COMPROBAR CONTRASEÑA
            ================================== */

            const passwordOK =
                await bcrypt.compare(
                    password,
                    user.password_hash
                );


            if (!passwordOK) {

                return res.status(401).json({
                    error:
                        "El correo o la contraseña no son correctos."
                });
            }


            /* ==================================
               CREAR SESIÓN NUEVA
            ================================== */

            req.session.regenerate(
                (sessionError) => {

                    if (sessionError) {

                        console.error(
                            "❌ ERROR REGENERANDO SESIÓN:",
                            sessionError
                        );

                        return res.status(500).json({
                            error:
                                "No se pudo crear la sesión."
                        });
                    }


                    /* ==============================
                       DATOS DE LA CUENTA
                    ============================== */

                    req.session.userId =
                        user.id;

                    req.session.email =
                        user.email;

                    req.session.authProvider =
                        "password";

                    req.session.name =
                        null;

                    req.session.picture =
                        null;


                    /* ==============================
                       GUARDAR SESIÓN
                    ============================== */

                    req.session.save(
                        (saveError) => {

                            if (saveError) {

                                console.error(
                                    "❌ ERROR GUARDANDO SESIÓN:",
                                    saveError
                                );

                                return res.status(500).json({
                                    error:
                                        "No se pudo guardar la sesión."
                                });
                            }


                            console.log(
                                "🔐 Inicio de sesión:",
                                user.email
                            );


                            /* ==============================
                               RESPUESTA AL LOGIN.JS
                            ============================== */

                            return res.json({

                                success:
                                    true,

                                message:
                                    "Inicio de sesión correcto.",

                                redirect:
                                    "/chat.html",

                                user: {

                                    id:
                                        user.id,

                                    email:
                                        user.email

                                }

                            });

                        }
                    );

                }
            );

        } catch (error) {

            console.error(
                "❌ ERROR LOGIN:",
                error
            );


            return res.status(500).json({
                error:
                    "No se pudo iniciar sesión."
            });
        }

    }
);


/* ==========================================
   COMPROBAR SESIÓN
========================================== */

router.get(
    "/me",
    (req, res) => {

        if (
            !req.session ||
            !req.session.userId
        ) {

            return res.json({
                authenticated:
                    false
            });
        }


        return res.json({

            authenticated:
                true,

            user: {

                id:
                    req.session.userId,

                email:
                    req.session.email,

                name:
                    req.session.name ||
                    null,

                picture:
                    req.session.picture ||
                    null,

                authProvider:
                    req.session.authProvider ||
                    null

            }

        });

    }
);


/* ==========================================
   CERRAR SESIÓN
========================================== */

router.post(
    "/logout",
    (req, res) => {

        if (!req.session) {

            return res.json({
                success:
                    true
            });
        }


        req.session.destroy(
            (error) => {

                if (error) {

                    console.error(
                        "❌ ERROR LOGOUT:",
                        error
                    );

                    return res.status(500).json({
                        error:
                            "No se pudo cerrar la sesión."
                    });
                }


                res.clearCookie(
                    "connect.sid"
                );


                return res.json({
                    success:
                        true
                });

            }
        );

    }
);


/* ==========================================
   EXPORTAR
========================================== */

module.exports = router;