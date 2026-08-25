


/* ==========================================
   NEXIX — REGISTRO
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    const registerButton =
        document.getElementById("registerButton");

    const emailInput =
        document.getElementById("email");

    const passwordInput =
        document.getElementById("password");

    const confirmPasswordInput =
        document.getElementById("confirmPassword");

    const togglePassword =
        document.getElementById("togglePassword");

    const toggleConfirmPassword =
        document.getElementById("toggleConfirmPassword");

    const googleRegister =
        document.getElementById("googleRegister");

    const discordRegister =
        document.getElementById("discordRegister");

    const githubRegister =
        document.getElementById("githubRegister");


    /* ==========================================
       COMPROBAR ELEMENTOS
    ========================================== */

    if (!registerButton) {
        console.error(
            "NEXIX: No se encontró #registerButton"
        );
        return;
    }

    if (!emailInput || !passwordInput || !confirmPasswordInput) {
        console.error(
            "NEXIX: Faltan campos del formulario."
        );
        return;
    }


    /* ==========================================
       MOSTRAR / OCULTAR CONTRASEÑA
    ========================================== */

    if (togglePassword) {

        togglePassword.addEventListener("click", () => {

            const mostrar =
                passwordInput.type === "password";

            passwordInput.type =
                mostrar ? "text" : "password";

            togglePassword.setAttribute(
                "aria-label",
                mostrar
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
            );

        });

    }


    /* ==========================================
       MOSTRAR / OCULTAR CONFIRMACIÓN
    ========================================== */

    if (toggleConfirmPassword) {

        toggleConfirmPassword.addEventListener(
            "click",
            () => {

                const mostrar =
                    confirmPasswordInput.type === "password";

                confirmPasswordInput.type =
                    mostrar ? "text" : "password";

                toggleConfirmPassword.setAttribute(
                    "aria-label",
                    mostrar
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                );

            }
        );

    }


    /* ==========================================
       GOOGLE
    ========================================== */

    if (googleRegister) {

        googleRegister.addEventListener(
            "click",
            () => {

                window.location.href =
                    "/api/auth/google";

            }
        );

    }


    /* ==========================================
       DISCORD
    ========================================== */

    if (discordRegister) {

        discordRegister.addEventListener(
            "click",
            () => {

                showMessage(
                    "El inicio de sesión con Discord todavía no está configurado.",
                    "info"
                );

            }
        );

    }


    /* ==========================================
       GITHUB
    ========================================== */

    if (githubRegister) {

        githubRegister.addEventListener(
            "click",
            () => {

                showMessage(
                    "El inicio de sesión con GitHub todavía no está configurado.",
                    "info"
                );

            }
        );

    }


    /* ==========================================
       CREAR CUENTA
    ========================================== */

    registerButton.addEventListener(
        "click",
        async () => {

            const email =
                emailInput.value.trim();

            const password =
                passwordInput.value;

            const confirmPassword =
                confirmPasswordInput.value;


            /* ------------------------------
               EMAIL
            ------------------------------ */

            if (!email) {

                showMessage(
                    "Introduce tu correo electrónico.",
                    "error"
                );

                emailInput.focus();

                return;
            }


            if (!isValidEmail(email)) {

                showMessage(
                    "Introduce un correo electrónico válido.",
                    "error"
                );

                emailInput.focus();

                return;
            }


            /* ------------------------------
               CONTRASEÑA
            ------------------------------ */

            if (!password) {

                showMessage(
                    "Introduce una contraseña.",
                    "error"
                );

                passwordInput.focus();

                return;
            }


            if (password.length < 8) {

                showMessage(
                    "La contraseña debe tener al menos 8 caracteres.",
                    "error"
                );

                passwordInput.focus();

                return;
            }


            /* ------------------------------
               CONFIRMACIÓN
            ------------------------------ */

            if (!confirmPassword) {

                showMessage(
                    "Repite la contraseña.",
                    "error"
                );

                confirmPasswordInput.focus();

                return;
            }


            if (password !== confirmPassword) {

                showMessage(
                    "Las contraseñas no coinciden.",
                    "error"
                );

                confirmPasswordInput.focus();

                return;
            }


            /* ------------------------------
               TURNSTILE
            ------------------------------ */

            let turnstileToken = "";

            if (
                window.turnstile &&
                typeof window.turnstile.getResponse === "function"
            ) {

                try {

                    turnstileToken =
                        window.turnstile.getResponse();

                } catch (error) {

                    console.error(
                        "NEXIX: Error obteniendo Turnstile:",
                        error
                    );

                }

            }


            if (!turnstileToken) {

                showMessage(
                    "Completa la verificación de seguridad.",
                    "error"
                );

                return;
            }


            /* ------------------------------
               CARGANDO
            ------------------------------ */

            setLoading(true);


            try {

                const response =
                    await fetch(
                        "/api/auth/register",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            credentials: "include",

                            body:
                                JSON.stringify({
                                    email: email,
                                    password: password,
                                    turnstileToken:
                                        turnstileToken
                                })
                        }
                    );


                let data = {};

                try {

                    data =
                        await response.json();

                } catch (error) {

                    console.warn(
                        "El servidor no devolvió JSON."
                    );

                }


                /* ------------------------------
                   ERROR
                ------------------------------ */

                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        data.message ||
                        "No se pudo crear la cuenta."
                    );

                }


                /* ------------------------------
                   CUENTA CREADA
                ------------------------------ */

                showMessage(
                    "Cuenta creada correctamente. Redirigiendo al inicio de sesión...",
                    "success"
                );


                setTimeout(
                    () => {

                        window.location.href =
                            "/login.html";

                    },
                    1200
                );


            } catch (error) {

                console.error(
                    "NEXIX — ERROR REGISTRO:",
                    error
                );


                showMessage(
                    error.message ||
                    "No se pudo crear la cuenta.",
                    "error"
                );


                /* ------------------------------
                   REINICIAR TURNSTILE
                ------------------------------ */

                if (
                    window.turnstile &&
                    typeof window.turnstile.reset === "function"
                ) {

                    try {

                        window.turnstile.reset();

                    } catch (resetError) {

                        console.error(
                            "Error reiniciando Turnstile:",
                            resetError
                        );

                    }

                }

            } finally {

                setLoading(false);

            }

        }
    );


    /* ==========================================
       VALIDAR EMAIL
    ========================================== */

    function isValidEmail(email) {

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            email
        );

    }


    /* ==========================================
       BOTÓN CARGANDO
    ========================================== */

    function setLoading(loading) {

        registerButton.disabled =
            loading;

        registerButton.textContent =
            loading
                ? "Creando cuenta..."
                : "Crear cuenta";

    }


    /* ==========================================
       MENSAJES
    ========================================== */

    function showMessage(
        message,
        type
    ) {

        let messageElement =
            document.getElementById(
                "registerMessage"
            );


        if (!messageElement) {

            messageElement =
                document.createElement("div");

            messageElement.id =
                "registerMessage";

            registerButton.parentNode.insertBefore(
                messageElement,
                registerButton
            );

        }


        messageElement.textContent =
            message;


        messageElement.style.margin =
            "0 0 12px 0";

        messageElement.style.padding =
            "10px 12px";

        messageElement.style.borderRadius =
            "9px";

        messageElement.style.fontSize =
            "12px";

        messageElement.style.fontWeight =
            "600";

        messageElement.style.textAlign =
            "center";


        if (type === "error") {

            messageElement.style.background =
                "#fef2f2";

            messageElement.style.color =
                "#b91c1c";

            messageElement.style.border =
                "1px solid #fecaca";

        } else if (type === "success") {

            messageElement.style.background =
                "#f0fdf4";

            messageElement.style.color =
                "#15803d";

            messageElement.style.border =
                "1px solid #bbf7d0";

        } else {

            messageElement.style.background =
                "#eff6ff";

            messageElement.style.color =
                "#1d4ed8";

            messageElement.style.border =
                "1px solid #bfdbfe";

        }


        clearTimeout(
            messageElement._timeout
        );


        messageElement._timeout =
            setTimeout(
                () => {

                    if (
                        messageElement &&
                        messageElement.parentNode
                    ) {

                        messageElement.remove();

                    }

                },
                6000
            );
// =====================================================
// 🛠️ DEBUG NEXIX — BOTONES Y REGISTRO
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("=================================");
    console.log("🛠️ NEXIX DEBUG INICIADO");
    console.log("=================================");

    // -------------------------------------------------
    // ELEMENTOS
    // -------------------------------------------------

    const elementos = {
        registerForm: document.getElementById("registerForm"),
        registerButton: document.getElementById("registerButton"),
        googleRegister: document.getElementById("googleRegister"),
        discordRegister: document.getElementById("discordRegister"),
        githubRegister: document.getElementById("githubRegister"),
        email: document.getElementById("email"),
        password: document.getElementById("password"),
        confirmPassword: document.getElementById("confirmPassword"),
        togglePassword: document.getElementById("togglePassword"),
        toggleConfirmPassword:
            document.getElementById("toggleConfirmPassword")
    };

    console.table(
        Object.fromEntries(
            Object.entries(elementos).map(([nombre, elemento]) => [
                nombre,
                elemento
                    ? "✅ ENCONTRADO"
                    : "❌ NO ENCONTRADO"
            ])
        )
    );


    // -------------------------------------------------
    // TURNSTILE
    // -------------------------------------------------

    console.log(
        "Turnstile:",
        window.turnstile
            ? "✅ CARGADO"
            : "❌ NO CARGADO"
    );


    // -------------------------------------------------
    // COMPROBAR BOTONES
    // -------------------------------------------------

    Object.entries(elementos).forEach(
        ([nombre, elemento]) => {

            if (!elemento) return;

            if (
                elemento.tagName === "BUTTON" ||
                elemento.tagName === "A"
            ) {

                elemento.addEventListener(
                    "click",
                    () => {

                        console.log(
                            `🖱️ CLICK → ${nombre}`
                        );

                        console.log(
                            "Elemento:",
                            elemento
                        );

                        console.log(
                            "href:",
                            elemento.href || "sin href"
                        );

                        console.log(
                            "type:",
                            elemento.type || "sin type"
                        );
                    },
                    true
                );
            }
        }
    );


    // -------------------------------------------------
    // GOOGLE
    // -------------------------------------------------

    const googleButton =
        elementos.googleRegister;

    if (googleButton) {

        console.log(
            "🔵 Google → botón preparado"
        );

        googleButton.addEventListener(
            "click",
            () => {

                console.log(
                    "🔵 GOOGLE CLICK"
                );

                console.log(
                    "➡️ Intentando abrir:",
                    "/api/auth/google"
                );

                fetch(
                    "/api/auth/google",
                    {
                        method: "GET",
                        credentials: "include",
                        redirect: "manual"
                    }
                )
                .then(response => {

                    console.log(
                        "Google HTTP:",
                        response.status
                    );

                    console.log(
                        "Google redirect:",
                        response.headers.get(
                            "location"
                        )
                    );

                })
                .catch(error => {

                    console.error(
                        "❌ ERROR GOOGLE:",
                        error
                    );

                });

            },
            true
        );
    }


    // -------------------------------------------------
    // DISCORD
    // -------------------------------------------------

    if (elementos.discordRegister) {

        console.log(
            "🟣 Discord → botón encontrado"
        );

        elementos.discordRegister.addEventListener(
            "click",
            () => {

                console.log(
                    "🟣 DISCORD CLICK"
                );

            },
            true
        );
    }


    // -------------------------------------------------
    // GITHUB
    // -------------------------------------------------

    if (elementos.githubRegister) {

        console.log(
            "⚫ GitHub → botón encontrado"
        );

        elementos.githubRegister.addEventListener(
            "click",
            () => {

                console.log(
                    "⚫ GITHUB CLICK"
                );

            },
            true
        );
    }


    // -------------------------------------------------
    // FORMULARIO
    // -------------------------------------------------

    if (elementos.registerForm) {

        elementos.registerForm.addEventListener(
            "submit",
            event => {

                console.log(
                    "📨 FORMULARIO ENVIADO"
                );

                console.log(
                    "Email:",
                    elementos.email?.value
                );

                console.log(
                    "Password:",
                    elementos.password?.value
                        ? "✅ ESCRITA"
                        : "❌ VACÍA"
                );

                console.log(
                    "Confirmación:",
                    elementos.confirmPassword?.value
                        ? "✅ ESCRITA"
                        : "❌ VACÍA"
                );

                console.log(
                    "Turnstile:",
                    window.turnstile
                        ? window.turnstile.getResponse()
                        : "NO DISPONIBLE"
                );

            },
            true
        );
    }


    // -------------------------------------------------
    // API REGISTER
    // -------------------------------------------------

    console.log(
        "🧪 Probando disponibilidad de API..."
    );

    fetch("/api/auth/me", {
        method: "GET",
        credentials: "include"
    })
        .then(response => {

            console.log(
                "API /api/auth/me:",
                response.status
            );

            return response.text();

        })
        .then(data => {

            console.log(
                "Respuesta /api/auth/me:",
                data
            );

        })
        .catch(error => {

            console.error(
                "❌ API NO DISPONIBLE:",
                error
            );

        });


    console.log("=================================");
    console.log("🛠️ DEBUG NEXIX LISTO");
    console.log("Pulsa ahora uno de los botones.");
    console.log("=================================");

});
    }

});

