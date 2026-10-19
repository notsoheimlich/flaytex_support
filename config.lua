-- ========================================================
-- FLAYTEX Support System
-- Standalone Support Ticket & Admin System
-- ========================================================

Config = {}

-- ========================================================
-- 1. Locales
-- ========================================================
-- English and German are already translated! Feel free to add your own language by creating a new locale file in the locales folder and adding it here.
Config.Locale = 'en'

-- ========================================================
-- 2. Commands & Keybinds
-- ========================================================

-- Command for the Support Ticket System (Everyone can use it)
Config.SupportCommand = 'support'
Config.SupportDefaultKey = 'F9' -- Optional: e.g. 'F9' or '' leave empty

-- Command for the Admin Ticket System (Only for Admins)
Config.AdminCommand = 'supportadmin'
Config.AdminDefaultKey = '' -- Optional: e.g. 'F10' or '' leave empty

-- ========================================================
-- 3. Standalone Admin-System (ACE Permissions or Fixed Identifiers)
-- ========================================================
Config.Admin = {
    UseAce = true,
    AcePermission = 'flaytex.supportadmin',

    Identifiers = {
        -- 'license:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        -- 'discord:123456789012345678',
    }
}

-- ========================================================
-- 4. Color Theme (Fully Customizable)
-- ========================================================
Config.Theme = {
    AccentColor = '#fc7f03',

    AccentHover = '#ff8f22',

    OnAccent = '#1a0f04',

    StatusOpen     = '#fc7f03',
    StatusProgress = '#e8b04a',
    StatusWaiting  = '#8fa6c8',
    StatusClosed   = '#6fbf8e',
}

-- ========================================================
-- 5. Ticket Categories (Fully Customizable, feel free to add your own categories or change the persistent categories)
-- ========================================================
Config.Categories = {
    {
        id = 'question',
        label = 'Frage',
        icon = 'question',
        requireTarget = false
    },
    {
        id = 'bug',
        label = 'Bug',
        icon = 'bug',
        requireTarget = false
    },
    {
        id = 'player',
        label = 'Spieler melden',
        icon = 'player',
        requireTarget = true
    },
    {
        id = 'refund',
        label = 'Rückerstattung',
        icon = 'refund',
        requireTarget = false
    },
    {
        id = 'other',
        label = 'Sonstiges',
        icon = 'other',
        requireTarget = false
    }
}

-- ========================================================
-- 6. Ticket validation & Limits (Fully Customizable)
-- ========================================================
Config.Ticket = {
    -- Cooldown in seconds between ticket submissions (to prevent spam)
    CooldownSeconds = 30,

    -- maximal allowed open tickets per player
    MinSubjectLength = 3,
    MaxSubjectLength = 60,

    -- maximal allowed message length per ticket
    MinMessageLength = 5,
    MaxMessageLength = 500,

    -- starting ticket ID (incremented for each new ticket)
    StartTicketId = 1000
}

-- ========================================================
-- 7. Discord Webhook Logs
-- ========================================================
-- WARNING: This is a Discord Webhook URL. Do not share it with anyone, as it can be used to send messages to your Discord channel.
Config.DiscordLogs = {
    Enabled = true,

    Webhook = 'DISCORD_WEBHOOK_URL_HERE',

    -- Name & Avatar of the Discord Bot (can be changed to your own)
    BotName = 'FLAYTEX Support Logs',
    BotAvatar = 'https://i.imgur.com/4M34hi2.png',

    -- Colors for the Discord Embed Messages (can be changed to your own)
    Colors = {
        TicketCreated = 16547587, -- #fc7f03 (Orange)
        TicketClaimed = 15258700, -- #E8B04A (Gold/Gelb)
        TicketReply   = 3447003,  -- #3498DB (Blau)
        TicketClosed  = 65280,    -- #00FF00 (Grün)
        AdminTeleport = 10181046, -- #9B59B6 (Lila)
    },

    -- Which events should be logged to Discord (can be changed to your own)
    Events = {
        TicketCreated = true,    -- Log: Neues Ticket wurde ingame eingereicht
        TicketClaimed = true,    -- Log: Ein Admin hat das Ticket übernommen
        TicketReply   = true,    -- Log: Chat-Verlauf (Spieler & Support Nachrichten)
        TicketClosed  = true,    -- Log: Ticket wurde geschlossen (von Spieler oder Team)
        AdminTeleport = true,    -- Log: Admin hat sich zum Spieler teleportiert oder hergeholt
    }
}

-- ========================================================
-- 8. Standalone Custom Messages (NUI Toasts)
-- ========================================================
Config.Notifications = {
    Duration = 5000,

    -- DONT TOUCH
    EnableFeedFallback = false,
}

-- DONT TOUCH
Config.Command = Config.SupportCommand
Config.DefaultKey = Config.SupportDefaultKey