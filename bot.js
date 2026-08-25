const {
    Client,
    GatewayIntentBits,
    Partials,
    ChannelType,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

require("dotenv").config();

// =====================================================
// CONFIGURACIÓN
// =====================================================

const TOKEN = process.env.DISCORD_TOKEN;

// Canal donde aparece el panel para los usuarios
const SUPPORT_PANEL_CHANNEL_ID = "1540357972226609303";

// Canal donde se avisa a los administradores
const ADMIN_CHANNEL_ID = "1540359711923372112";

// Roles que pueden coger y cerrar casos
const ADMIN_ROLE_IDS = [
    process.env.ADMIN_ROLE_ID_1,
    process.env.ADMIN_ROLE_ID_2
].filter(Boolean);

// =====================================================
// COMPROBAR CONFIGURACIÓN
// =====================================================

console.log("================================");
console.log("      CONFIGURACIÓN NEXIX");
console.log("================================");

console.log(
    "📌 Canal panel:",
    SUPPORT_PANEL_CHANNEL_ID
);

console.log(
    "📌 Canal administradores:",
    ADMIN_CHANNEL_ID
);

console.log(
    "👑 Roles administradores:",
    ADMIN_ROLE_IDS
);

if (ADMIN_ROLE_IDS.length === 0) {
    console.warn(
        "⚠️ NO HAY ROLES DE ADMINISTRADOR CONFIGURADOS EN .env"
    );
}

console.log("================================");

// =====================================================
// CLIENTE
// =====================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ],
    partials: [
        Partials.Channel
    ]
});

// =====================================================
// DATOS TEMPORALES
// =====================================================

const supportData = new Map();

// =====================================================
// CATEGORÍAS
// =====================================================

const SUPPORT_CATEGORIES = [
    {
        label: "Error 400",
        value: "error_400",
        description: "Solicitud incorrecta"
    },
    {
        label: "Error 401",
        value: "error_401",
        description: "No autorizado"
    },
    {
        label: "Error 402",
        value: "error_402",
        description: "Problema de pago"
    },
    {
        label: "Error 403",
        value: "error_403",
        description: "Acceso denegado"
    },
    {
        label: "Error 404",
        value: "error_404",
        description: "Recurso no encontrado"
    },
    {
        label: "Error 408",
        value: "error_408",
        description: "Tiempo de espera agotado"
    },
    {
        label: "Error 429",
        value: "error_429",
        description: "Demasiadas solicitudes"
    },
    {
        label: "Error 500",
        value: "error_500",
        description: "Error interno del servidor"
    },
    {
        label: "Error 502",
        value: "error_502",
        description: "Bad Gateway"
    },
    {
        label: "Error 503",
        value: "error_503",
        description: "Servicio no disponible"
    },
    {
        label: "Otro",
        value: "otro",
        description: "Otro problema"
    }
];

// =====================================================
// FUNCIÓN PARA COMPROBAR ADMIN
// =====================================================

function esAdministrador(member) {

    if (!member) {
        return false;
    }

    // Si tiene Administrador de Discord
    if (
        member.permissions &&
        member.permissions.has(
            PermissionFlagsBits.Administrator
        )
    ) {
        return true;
    }

    // Comprobar roles configurados
    if (
        !member.roles ||
        !member.roles.cache
    ) {
        return false;
    }

    return ADMIN_ROLE_IDS.some(
        roleId =>
            member.roles.cache.has(roleId)
    );
}

// =====================================================
// BOTÓN DEL PANEL
// =====================================================

function createSupportButton() {

    return new ActionRowBuilder().addComponents(

        new ButtonBuilder()
            .setCustomId("abrir_soporte")
            .setLabel("Abrir soporte")
            .setEmoji("🎫")
            .setStyle(ButtonStyle.Primary)

    );
}

// =====================================================
// EMBED DEL PANEL
// =====================================================

function createSupportPanel() {

    return new EmbedBuilder()

        .setTitle("🎫 Soporte NEXIX")

        .setDescription(
            "¿Necesitas ayuda?\n\n" +
            "Pulsa el botón **🎫 Abrir soporte** para crear un caso.\n\n" +
            "📝 Explica tu problema.\n" +
            "📂 Selecciona la categoría correspondiente.\n\n" +
            "Nuestro equipo revisará tu caso lo antes posible."
        )

        .setColor(0x5865F2)

        .setFooter({
            text: "NEXIX • Sistema de soporte"
        })

        .setTimestamp();
}

// =====================================================
// PUBLICAR PANEL
// =====================================================

async function setupSupportPanel() {

    try {

        console.log(
            "🔎 Buscando canal del panel..."
        );

        const channel =
            await client.channels.fetch(
                SUPPORT_PANEL_CHANNEL_ID
            );

        if (!channel) {

            console.error(
                "❌ No se encontró el canal del panel."
            );

            return;
        }

        if (!channel.isTextBased()) {

            console.error(
                "❌ El canal no es de texto."
            );

            return;
        }

        console.log(
            `📢 Canal encontrado: #${channel.name}`
        );

        const messages =
            await channel.messages.fetch({
                limit: 100
            });

        const panelExistente =
            messages.find(
                message =>
                    message.author.id === client.user.id &&
                    message.embeds.length > 0 &&
                    message.embeds[0].title ===
                        "🎫 Soporte NEXIX"
            );

        if (panelExistente) {

            console.log(
                "✅ El panel ya existe."
            );

            return;
        }

        await channel.send({

            embeds: [
                createSupportPanel()
            ],

            components: [
                createSupportButton()
            ]

        });

        console.log(
            "✅ Panel publicado correctamente."
        );

    } catch (error) {

        console.error(
            "❌ ERROR PUBLICANDO PANEL:"
        );

        console.error(error);

    }
}

// =====================================================
// READY
// =====================================================

client.once(
    "clientReady",
    async () => {

        console.log("");
        console.log("================================");
        console.log("        NEXIX DISCORD BOT");
        console.log("================================");
        console.log("");

        console.log(
            `✅ Bot conectado como ${client.user.tag}`
        );

        console.log(
            `🆔 ID: ${client.user.id}`
        );

        console.log("");

        console.log(
            "🎫 Sistema de soporte: ACTIVADO"
        );

        console.log(
            `📢 Canal panel: ${SUPPORT_PANEL_CHANNEL_ID}`
        );

        console.log(
            `📢 Canal admin: ${ADMIN_CHANNEL_ID}`
        );

        console.log(
            `👑 Roles admin: ${ADMIN_ROLE_IDS.join(", ")}`
        );

        console.log("");

        await setupSupportPanel();

    }
);

// =====================================================
// INTERACCIONES
// =====================================================

client.on(
    "interactionCreate",
    async interaction => {

        try {

            // =================================================
            // ABRIR SOPORTE
            // =================================================

            if (
                interaction.isButton() &&
                interaction.customId === "abrir_soporte"
            ) {

                const modal =
                    new ModalBuilder()
                        .setCustomId(
                            "formulario_soporte"
                        )
                        .setTitle(
                            "Soporte NEXIX"
                        );

                const usuario =
                    new TextInputBuilder()
                        .setCustomId(
                            "usuario"
                        )
                        .setLabel(
                            "Nombre de usuario"
                        )
                        .setPlaceholder(
                            "Escribe tu nombre de usuario"
                        )
                        .setStyle(
                            TextInputStyle.Short
                        )
                        .setRequired(true)
                        .setMaxLength(100);

                const problema =
                    new TextInputBuilder()
                        .setCustomId(
                            "problema"
                        )
                        .setLabel(
                            "Explica tu problema"
                        )
                        .setPlaceholder(
                            "Describe lo que ha ocurrido..."
                        )
                        .setStyle(
                            TextInputStyle.Paragraph
                        )
                        .setRequired(true)
                        .setMaxLength(1000);

                modal.addComponents(

                    new ActionRowBuilder()
                        .addComponents(
                            usuario
                        ),

                    new ActionRowBuilder()
                        .addComponents(
                            problema
                        )

                );

                await interaction.showModal(
                    modal
                );

                return;
            }

            // =================================================
            // FORMULARIO
            // =================================================

            if (
                interaction.isModalSubmit() &&
                interaction.customId ===
                    "formulario_soporte"
            ) {

                const problema =
                    interaction.fields.getTextInputValue(
                        "problema"
                    );

                supportData.set(
                    interaction.user.id,
                    {
                        problema
                    }
                );

                const menu =
                    new StringSelectMenuBuilder()
                        .setCustomId(
                            `categoria_soporte_${interaction.user.id}`
                        )
                        .setPlaceholder(
                            "Selecciona la categoría del problema"
                        )
                        .addOptions(
                            SUPPORT_CATEGORIES
                        );

                const row =
                    new ActionRowBuilder()
                        .addComponents(
                            menu
                        );

                await interaction.reply({

                    content:
                        "Selecciona ahora la categoría del problema:",

                    components: [
                        row
                    ],

                    flags:
                        MessageFlags.Ephemeral

                });

                return;
            }

            // =================================================
            // SELECCIONAR CATEGORÍA
            // =================================================

            if (
                interaction.isStringSelectMenu() &&
                interaction.customId.startsWith(
                    "categoria_soporte_"
                )
            ) {

                const userId =
                    interaction.customId.replace(
                        "categoria_soporte_",
                        ""
                    );

                if (
                    interaction.user.id !== userId
                ) {

                    await interaction.reply({

                        content:
                            "❌ Este formulario no te pertenece.",

                        flags:
                            MessageFlags.Ephemeral

                    });

                    return;
                }

                const datos =
                    supportData.get(
                        userId
                    );

                if (!datos) {

                    await interaction.update({

                        content:
                            "❌ El formulario ha caducado. Vuelve a abrir el soporte.",

                        components: []

                    });

                    return;
                }

                const guild =
                    interaction.guild;

                if (!guild) {

                    await interaction.update({

                        content:
                            "❌ El soporte solo funciona dentro de un servidor.",

                        components: []

                    });

                    return;
                }

                // =================================================
                // COMPROBAR CASO EXISTENTE
                // =================================================

                const canalExistente =
                    guild.channels.cache.find(
                        channel =>
                            channel.topic ===
                            `NEXIX_SUPPORT_${userId}`
                    );

                if (canalExistente) {

                    supportData.delete(
                        userId
                    );

                    await interaction.update({

                        content:
                            `❌ Ya tienes un caso abierto: ${canalExistente}`,

                        components: []

                    });

                    return;
                }

                // =================================================
                // CATEGORÍA
                // =================================================

                const categoria =
                    interaction.values[0];

                const categoriaInfo =
                    SUPPORT_CATEGORIES.find(
                        item =>
                            item.value ===
                            categoria
                    );

                const categoriaNombre =
                    categoriaInfo
                        ? categoriaInfo.label
                        : "Otro";

                // =================================================
                // PERMISOS
                // =================================================

                const permissionOverwrites = [

                    {
                        id:
                            guild.roles.everyone.id,

                        deny: [
                            PermissionFlagsBits.ViewChannel
                        ]

                    },

                    {
                        id:
                            interaction.user.id,

                        allow: [

                            PermissionFlagsBits.ViewChannel,

                            PermissionFlagsBits.SendMessages,

                            PermissionFlagsBits.ReadMessageHistory,

                            PermissionFlagsBits.AttachFiles

                        ]

                    }

                ];

                for (
                    const roleId of ADMIN_ROLE_IDS
                ) {

                    const role =
                        guild.roles.cache.get(
                            roleId
                        );

                    if (role) {

                        permissionOverwrites.push({

                            id:
                                role.id,

                            allow: [

                                PermissionFlagsBits.ViewChannel,

                                PermissionFlagsBits.SendMessages,

                                PermissionFlagsBits.ReadMessageHistory,

                                PermissionFlagsBits.ManageMessages

                            ]

                        });

                    }

                }

                // =================================================
                // NOMBRE DEL CANAL
                // =================================================

                const username =
                    interaction.user.username
                        .toLowerCase()
                        .replace(
                            /[^a-z0-9-_]/g,
                            "-"
                        )
                        .slice(
                            0,
                            60
                        );

                // =================================================
                // CREAR CANAL
                // =================================================

                const supportChannel =
                    await guild.channels.create({

                        name:
                            `soporte-${username}`,

                        type:
                            ChannelType.GuildText,

                        topic:
                            `NEXIX_SUPPORT_${userId}`,

                        permissionOverwrites

                    });

                // =================================================
                // EMBED
                // =================================================

                const embed =
                    new EmbedBuilder()

                        .setTitle(
                            "🎫 Caso de soporte NEXIX"
                        )

                        .setDescription(
                            "Un nuevo caso de soporte ha sido abierto."
                        )

                        .addFields(

                            {
                                name:
                                    "👤 Usuario",

                                value:
                                    `${interaction.user}\n${datos.usuario}`,

                                inline:
                                    true
                            },

                            {
                                name:
                                    "📂 Categoría",

                                value:
                                    categoriaNombre,

                                inline:
                                    true
                            },

                            {
                                name:
                                    "📝 Problema",

                                value:
                                    datos.problema,

                                inline:
                                    false
                            }

                        )

                        .setColor(
                            0x5865F2
                        )

                        .setTimestamp();

                // =================================================
                // BOTONES DEL TICKET
                // =================================================

                const botones =
                    new ActionRowBuilder()
                        .addComponents(

                            new ButtonBuilder()
                                .setCustomId(
                                    "coger_caso"
                                )
                                .setLabel(
                                    "Coger caso"
                                )
                                .setEmoji(
                                    "👋"
                                )
                                .setStyle(
                                    ButtonStyle.Success
                                ),

                            new ButtonBuilder()
                                .setCustomId(
                                    "cerrar_caso"
                                )
                                .setLabel(
                                    "Cerrar caso"
                                )
                                .setEmoji(
                                    "🔒"
                                )
                                .setStyle(
                                    ButtonStyle.Danger
                                )

                        );

                // =================================================
                // MENSAJE DEL TICKET
                // =================================================

                await supportChannel.send({

                    content:
                        `${interaction.user}`,

                    embeds: [
                        embed
                    ],

                    components: [
                        botones
                    ]

                });

                // =================================================
                // AVISO ADMIN
                // =================================================

                const adminChannel =
                    guild.channels.cache.get(
                        ADMIN_CHANNEL_ID
                    );

                if (adminChannel) {

                    const menciones =
                        ADMIN_ROLE_IDS.length > 0

                            ? ADMIN_ROLE_IDS
                                .map(
                                    id =>
                                        `<@&${id}>`
                                )
                                .join(" ")

                            : "@here";

                    const adminEmbed =
                        new EmbedBuilder()

                            .setTitle(
                                "🚨 NUEVO CASO DE SOPORTE"
                            )

                            .setDescription(
                                "Se ha abierto un nuevo caso de soporte."
                            )

                            .addFields(

                                {
                                    name:
                                        "👤 Usuario",

                                    value:
                                        `${interaction.user}\n${datos.usuario}`,

                                    inline:
                                        true
                                },

                                {
                                    name:
                                        "📂 Categoría",

                                    value:
                                        categoriaNombre,

                                    inline:
                                        true
                                },

                                {
                                    name:
                                        "🎫 Caso",

                                    value:
                                        `${supportChannel}`,

                                    inline:
                                        false
                                }

                            )

                            .setColor(
                                0xED4245
                            )

                            .setTimestamp();

                    await adminChannel.send({

                        content:
                            menciones,

                        embeds: [
                            adminEmbed
                        ]

                    });

                }

                // =================================================
                // LIMPIAR
                // =================================================

                supportData.delete(
                    userId
                );

                await interaction.update({

                    content:
                        `✅ Tu caso ha sido creado correctamente.\n\n${supportChannel}`,

                    components: []

                });

                return;
            }

            // =================================================
            // COGER CASO
            // =================================================

            if (
                interaction.isButton() &&
                interaction.customId ===
                    "coger_caso"
            ) {

                console.log(
                    `👤 ${interaction.user.tag} ha pulsado Coger caso.`
                );

                console.log(
                    `🆔 Usuario: ${interaction.user.id}`
                );

                console.log(
                    `👑 Roles configurados:`,
                    ADMIN_ROLE_IDS
                );

                console.log(
                    `👤 Roles del usuario:`,
                    interaction.member.roles.cache.map(
                        role => role.id
                    )
                );

                const esAdmin =
                    esAdministrador(
                        interaction.member
                    );

                console.log(
                    `🔐 ¿Es administrador?: ${esAdmin}`
                );

                if (!esAdmin) {

                    await interaction.reply({

                        content:
                            "❌ Solo los administradores pueden coger casos.",

                        flags:
                            MessageFlags.Ephemeral

                    });

                    return;
                }

                await interaction.reply({

                    content:
                        `👋 **${interaction.user.username}** se ha hecho cargo de este caso.`

                });

                return;
            }

            // =================================================
            // CERRAR CASO
            // =================================================

            if (
                interaction.isButton() &&
                interaction.customId ===
                    "cerrar_caso"
            ) {

                const esAdmin =
                    esAdministrador(
                        interaction.member
                    );

                if (!esAdmin) {

                    await interaction.reply({

                        content:
                            "❌ Solo los administradores pueden cerrar casos.",

                        flags:
                            MessageFlags.Ephemeral

                    });

                    return;
                }

                await interaction.reply({

                    content:
                        "🔒 El caso se cerrará en 5 segundos."

                });

                setTimeout(
                    async () => {

                        try {

                            await interaction.channel.delete();

                        } catch (error) {

                            console.error(
                                "❌ Error cerrando caso:",
                                error.message
                            );

                        }

                    },
                    5000
                );

                return;
            }

        } catch (error) {

            console.error(
                "❌ ERROR:",
                error
            );

            try {

                if (
                    interaction.replied ||
                    interaction.deferred
                ) {

                    await interaction.followUp({

                        content:
                            "❌ Ha ocurrido un error en NEXIX.",

                        flags:
                            MessageFlags.Ephemeral

                    });

                } else {

                    await interaction.reply({

                        content:
                            "❌ Ha ocurrido un error en NEXIX.",

                        flags:
                            MessageFlags.Ephemeral

                    });

                }

            } catch (_) {}

        }

    }
);

// =====================================================
// LOGIN
// =====================================================

if (!TOKEN) {

    console.error(
        "❌ Falta DISCORD_TOKEN en el archivo .env"
    );

    process.exit(1);
}

client.login(TOKEN);