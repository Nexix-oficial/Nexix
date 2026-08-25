```javascript
/* ==========================================
   NEXIX — LOGIN.JS
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    console.log("NEXIX LOGIN.JS CARGADO");

    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const loginButton = document.getElementById("loginButton");
    const togglePassword = document.getElementById("togglePassword");

    const googleLogin = document.getElementById("googleLogin");
    const discordLogin = document.getElementById("discordLogin");
    const githubLogin = document.getElementById("githubLogin");


    /* ==========================================
       MOSTRAR / OCULTAR CONTRASEÑA
    ========================================== */

    if (togglePassword && passwordInput) {

        togglePassword.addEventListener("click", () => {

            const mostrar =
                passwordInput.type === "password";

            passwordInput.type =
                mostrar ? "text" : "password";

            togglePassword.textContent =
                mostrar ? "○" : "◉";

            togglePassword.setAttribute(
                "aria-label",
                mostrar
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
            );
        });
    }


    /* ==========================================
       LOGIN CON CORREO
    ========================================== */

    if (loginForm) {

        loginForm.addEventListener("submit", async (event) => {

            event.preventDefault();

            const email =
                emailInput.value.trim();

            const password =
                passwordInput.value;


            /* ==================================
               VALIDAR EMAIL
            ================================== */

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


            /* ==================================
               VALIDAR CONTRASEÑA
            ================================== */

            if (!password) {

                showMessage(
                    "Introduce tu contraseña.",
                    "error"
                );

                passwordInput.focus();
                return;
            }


            /* ==================================
               TURNSTILE
            ================================== */

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
                        "Error obteniendo Turnstile:",
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


            /* ==================================
               CARGANDO
            ================================== */

            setLoading(true);


            try {

                const response =
                    await fetch(
                        "/api/auth/login",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            credentials: "include",

                            body: JSON.stringify({
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

                } catch {

                    data = {};
                }


                /* ==================================
                   ERROR
                ================================== */

                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        data.message ||
                        "No se pudo iniciar sesión."
                    );
                }


                /* ==================================
                   LOGIN CORRECTO
                ================================== */

                showMessage(
                    "Inicio de sesión correcto.",
                    "success"
                );


                setTimeout(() => {

                    if (data.redirect) {

                        window.location.href =
                            data.redirect;

                    } else {

                        window.location.href =
                            "/chat.html";
                    }

                }, 600);


            } catch (error) {

                console.error(
                    "ERROR LOGIN:",
                    error
                );

                showMessage(
                    error.message ||
                    "No se pudo iniciar sesión.",
                    "error"
                );


                /* ==================================
                   REINICIAR TURNSTILE
                ================================== */

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

        });
    }


    /* ==========================================
       GOOGLE
    ========================================== */

    if (googleLogin) {

        googleLogin.addEventListener("click", () => {

            console.log(
                "BOTÓN GOOGLE PULSADO"
            );

            window.location.href =
                "/api/auth/google";
        });
    }


    /* ==========================================
       DISCORD
    ========================================== */

    if (discordLogin) {

        discordLogin.addEventListener("click", () => {

            showMessage(
                "El inicio de sesión con Discord todavía no está configurado.",
                "info"
            );
        });
    }


    /* ==========================================
       GITHUB
    ========================================== */

    if (githubLogin) {

        githubLogin.addEventListener("click", () => {

            showMessage(
                "El inicio de sesión con GitHub todavía no está configurado.",
                "info"
            );
        });
    }


    /* ==========================================
       VALIDAR EMAIL
    ========================================== */

    function isValidEmail(email) {

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }


    /* ==========================================
       BOTÓN CARGANDO
    ========================================== */

    function setLoading(loading) {

        if (!loginButton) {
            return;
        }

        loginButton.disabled =
            loading;

        loginButton.textContent =
            loading
                ? "Iniciando sesión..."
                : "Iniciar sesión";
    }


    /* ==========================================
       MENSAJES
    ========================================== */

    function showMessage(message, type) {

        let messageElement =
            document.getElementById("loginMessage");


        if (!messageElement) {

            messageElement =
                document.createElement("div");

            messageElement.id =
                "loginMessage";

            if (loginForm) {

                loginForm.prepend(
                    messageElement
                );
            }
        }


        messageElement.textContent =
            message;


        messageElement.style.width =
            "100%";

        messageElement.style.margin =
            "8px 0";

        messageElement.style.padding =
            "8px 10px";

        messageElement.style.borderRadius =
            "8px";

        messageElement.style.fontSize =
            "11px";

        messageElement.style.fontWeight =
            "600";

        messageElement.style.lineHeight =
            "1.4";

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
            setTimeout(() => {

                if (
                    messageElement &&
                    messageElement.parentNode
                ) {

                    messageElement.remove();
                }

            }, 5000);
    }

});
```
