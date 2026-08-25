const chat = document.getElementById("chat");
const input = document.getElementById("message");
const send = document.getElementById("send");
const newChat = document.getElementById("newChat");

// ==========================================
// ELEMENTOS DEL BOTÓN +
// ==========================================

const plusButton = document.getElementById("plusButton");
const commandMenu = document.getElementById("commandMenu");

const generateImageCommand =
    document.getElementById("generateImageCommand");

const analyzeImageCommand =
    document.getElementById("analyzeImageCommand");

const attachFileCommand =
    document.getElementById("attachFileCommand");

const newChatCommand =
    document.getElementById("newChatCommand");

const imageInput =
    document.getElementById("imageInput");

const fileInput =
    document.getElementById("fileInput");

// ==========================================
// AÑADIR MENSAJE
// ==========================================

function addMessage(text, type) {

    const message =
        document.createElement("div");

    message.className =
        `message ${type}`;

    message.textContent =
        text;

    chat.appendChild(message);

    chat.scrollTop =
        chat.scrollHeight;

    return message;
}

// ==========================================
// AÑADIR IMAGEN
// ==========================================

function addImage(imageData) {

    const container =
        document.createElement("div");

    container.className =
        "message ai";

    const image =
        document.createElement("img");

    image.src =
        `data:${imageData.mimeType};base64,${imageData.data}`;

    image.alt =
        "Imagen generada por NEXIX";

    image.style.maxWidth =
        "100%";

    image.style.width =
        "600px";

    image.style.borderRadius =
        "15px";

    image.style.display =
        "block";

    image.style.marginTop =
        "10px";

    container.appendChild(image);

    chat.appendChild(container);

    chat.scrollTop =
        chat.scrollHeight;
}

// ==========================================
// INDICADOR DE PENSAMIENTO
// ==========================================

function createThinking() {

    const container =
        document.createElement("div");

    container.className =
        "message ai thinking-message";

    const thinking =
        document.createElement("div");

    thinking.className =
        "thinking-animation";

    for (let i = 0; i < 8; i++) {

        const dot =
            document.createElement("span");

        dot.className =
            "thinking-dot";

        thinking.appendChild(dot);
    }

    container.appendChild(thinking);

    chat.appendChild(container);

    chat.scrollTop =
        chat.scrollHeight;

    setTimeout(() => {

        thinking.classList.add(
            "thinking-circle"
        );

    }, 900);

    return container;
}

// ==========================================
// MARKDOWN
// ==========================================

function formatResponse(text) {

    let formatted = text;

    formatted =
        formatted
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

    // Código
    formatted =
        formatted.replace(
            /```([\s\S]*?)```/g,
            "<pre><code>$1</code></pre>"
        );

    // Código inline
    formatted =
        formatted.replace(
            /`([^`]+)`/g,
            "<code>$1</code>"
        );

    // Negrita
    formatted =
        formatted.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );

    // Títulos
    formatted =
        formatted.replace(
            /^### (.*)$/gm,
            "<h3>$1</h3>"
        );

    formatted =
        formatted.replace(
            /^## (.*)$/gm,
            "<h2>$1</h2>"
        );

    formatted =
        formatted.replace(
            /^# (.*)$/gm,
            "<h1>$1</h1>"
        );

    // Listas
    formatted =
        formatted.replace(
            /^- (.*)$/gm,
            "<li>$1</li>"
        );

    formatted =
        formatted.replace(
            /(<li>.*<\/li>)/gs,
            "<ul>$1</ul>"
        );

    // Saltos
    formatted =
        formatted.replace(
            /\n/g,
            "<br>"
        );

    return formatted;
}

// ==========================================
// FUENTES
// ==========================================

function addSources(sources) {

    if (
        !sources ||
        sources.length === 0
    ) {
        return;
    }

    const container =
        document.createElement("div");

    container.className =
        "message ai sources-container";

    const title =
        document.createElement("div");

    title.className =
        "sources-title";

    title.textContent =
        "🔎 Fuentes";

    container.appendChild(title);

    const list =
        document.createElement("div");

    list.className =
        "sources-list";

    sources.forEach((source) => {

        if (!source.url) {
            return;
        }

        const link =
            document.createElement("a");

        link.href =
            source.url;

        link.target =
            "_blank";

        link.rel =
            "noopener noreferrer";

        link.className =
            "source-link";

        const icon =
            document.createElement("span");

        icon.textContent =
            "🌐";

        const title =
            document.createElement("span");

        title.textContent =
            source.title ||
            source.url;

        link.appendChild(icon);

        link.appendChild(title);

        list.appendChild(link);
    });

    container.appendChild(list);

    chat.appendChild(container);

    chat.scrollTop =
        chat.scrollHeight;
}

// ==========================================
// ENVIAR MENSAJE
// ==========================================

async function sendMessage() {

    const text =
        input.value.trim();

    if (!text) {
        return;
    }

    const welcome =
        document.getElementById("welcome");

    if (welcome) {
        welcome.remove();
    }

    addMessage(
        text,
        "user"
    );

    input.value = "";

    const thinking =
        createThinking();

    try {

        const response =
            await fetch(
                "/api/chat",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            message: text
                        })
                }
            );

        // ==================================
        // ERROR
        // ==================================

        if (!response.ok) {

            let errorText =
                "Error desconocido.";

            try {

                const errorData =
                    await response.json();

                errorText =
                    errorData.details ||
                    errorData.error ||
                    errorText;

            } catch (_) {}

            thinking.remove();

            addMessage(
                "❌ " + errorText,
                "ai"
            );

            return;
        }

        // ==================================
        // JSON NORMAL
        // ==================================

        const contentType =
            response.headers.get(
                "content-type"
            ) || "";

        if (
            contentType.includes(
                "application/json"
            )
        ) {

            const data =
                await response.json();

            thinking.remove();

            if (
                data.type === "image"
            ) {

                if (data.response) {

                    addMessage(
                        data.response,
                        "ai"
                    );
                }

                if (data.image) {

                    addImage(
                        data.image
                    );
                }

                return;
            }

            addMessage(
                data.response ||
                data.error ||
                "No se recibió ninguna respuesta.",
                "ai"
            );

            return;
        }

        // ==================================
        // STREAMING
        // ==================================

        if (!response.body) {

            thinking.remove();

            addMessage(
                "❌ El servidor no admite streaming.",
                "ai"
            );

            return;
        }

        thinking.remove();

        const message =
            document.createElement("div");

        message.className =
            "message ai";

        chat.appendChild(message);

        const reader =
            response.body.getReader();

        const decoder =
            new TextDecoder("utf-8");

        let buffer = "";
        let fullText = "";
        let sources = [];

        // ==================================
        // LEER STREAM
        // ==================================

        while (true) {

            const {
                value,
                done
            } =
                await reader.read();

            if (done) {
                break;
            }

            buffer +=
                decoder.decode(
                    value,
                    {
                        stream: true
                    }
                );

            const lines =
                buffer.split("\n");

            buffer =
                lines.pop();

            for (
                const line of lines
            ) {

                if (!line.trim()) {
                    continue;
                }

                try {

                    const data =
                        JSON.parse(line);

                    // TEXTO

                    if (
                        data.type === "text"
                    ) {

                        fullText +=
                            data.text || "";

                        message.innerHTML =
                            formatResponse(
                                fullText
                            );

                        chat.scrollTop =
                            chat.scrollHeight;
                    }

                    // FUENTES

                    if (
                        data.type === "sources"
                    ) {

                        sources =
                            data.sources || [];
                    }

                    // ERROR

                    if (
                        data.type === "error"
                    ) {

                        console.error(
                            "NEXIX:",
                            data.error
                        );
                    }

                } catch (error) {

                    console.error(
                        "Error procesando NDJSON:",
                        error
                    );
                }
            }
        }

        // ==================================
        // ÚLTIMA PARTE
        // ==================================

        buffer +=
            decoder.decode();

        if (buffer.trim()) {

            try {

                const data =
                    JSON.parse(
                        buffer.trim()
                    );

                if (
                    data.type === "text"
                ) {

                    fullText +=
                        data.text || "";
                }

                if (
                    data.type === "sources"
                ) {

                    sources =
                        data.sources || [];
                }

            } catch (error) {

                console.error(
                    "Error final NDJSON:",
                    error
                );
            }
        }

        // ==================================
        // RESPUESTA FINAL
        // ==================================

        message.innerHTML =
            formatResponse(
                fullText
            );

        // ==================================
        // FUENTES
        // ==================================

        if (
            sources.length > 0
        ) {

            addSources(
                sources
            );
        }

        chat.scrollTop =
            chat.scrollHeight;

    } catch (error) {

        console.error(
            "❌ Error:",
            error
        );

        thinking.remove();

        addMessage(
            "❌ No se pudo conectar con NEXIX.",
            "ai"
        );
    }
}

// ==========================================
// BOTÓN ENVIAR
// ==========================================

send.addEventListener(
    "click",
    sendMessage
);

// ==========================================
// ENTER
// ==========================================

input.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();
        }
    }
);

// ==========================================
// BOTÓN +
// ==========================================

if (
    plusButton &&
    commandMenu
) {

    plusButton.addEventListener(
        "click",
        function(event) {

            event.stopPropagation();

            commandMenu.classList.toggle(
                "show"
            );
        }
    );

    document.addEventListener(
        "click",
        function(event) {

            if (
                !commandMenu.contains(
                    event.target
                ) &&
                event.target !== plusButton
            ) {

                commandMenu.classList.remove(
                    "show"
                );
            }
        }
    );
}

// ==========================================
// GENERAR IMAGEN
// ==========================================

if (generateImageCommand) {

    generateImageCommand.addEventListener(
        "click",
        function() {

            input.value =
                "Genera una imagen de ";

            input.focus();

            commandMenu.classList.remove(
                "show"
            );
        }
    );
}

// ==========================================
// ANALIZAR IMAGEN
// ==========================================

if (
    analyzeImageCommand &&
    imageInput
) {

    analyzeImageCommand.addEventListener(
        "click",
        function() {

            imageInput.click();

            commandMenu.classList.remove(
                "show"
            );
        }
    );

    imageInput.addEventListener(
        "change",
        function() {

            const file =
                imageInput.files?.[0];

            if (!file) {
                return;
            }

            input.value =
                `Analiza esta imagen: ${file.name}`;

            input.focus();
        }
    );
}

// ==========================================
// ADJUNTAR ARCHIVO
// ==========================================

if (
    attachFileCommand &&
    fileInput
) {

    attachFileCommand.addEventListener(
        "click",
        function() {

            fileInput.click();

            commandMenu.classList.remove(
                "show"
            );
        }
    );

    fileInput.addEventListener(
        "change",
        function() {

            const file =
                fileInput.files?.[0];

            if (!file) {
                return;
            }

            input.value =
                `Archivo adjunto: ${file.name}`;

            input.focus();
        }
    );
}

// ==========================================
// NUEVO CHAT DESDE +
// ==========================================

if (newChatCommand) {

    newChatCommand.addEventListener(
        "click",
        function() {

            commandMenu.classList.remove(
                "show"
            );

            newChat.click();
        }
    );
}

// ==========================================
// NUEVO CHAT
// ==========================================

newChat.addEventListener(
    "click",
    async function() {

        try {

            await fetch(
                "/api/new-chat",
                {
                    method: "POST"
                }
            );

        } catch (error) {

            console.error(
                error
            );
        }

        chat.innerHTML = `

            <div
                class="welcome"
                id="welcome"
            >

                <h1>
                    ¿En qué puedo ayudarte?
                </h1>

                <p>
                    Pregunta lo que quieras a NEXIX AI.
                </p>

            </div>

        `;

        input.value = "";
    }
);