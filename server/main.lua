-- ========================================================
-- FLAYTEX Support - Standalone Server Logic
-- Grundsatz: Der Client entscheidet nichts. Nur der Server validiert.
-- Inklusive Discord Webhook Logging & Standalone Notifys
-- ========================================================

Config = Config or {}

local tickets = {}
local nextTicketId = (Config.Ticket and Config.Ticket.StartTicketId) or 1000
local playerCooldowns = {}

-- Dynamische Ermittlung der Kategorie-Konfiguration
local function getCategoryInfo(catId)
    if Config.Categories and #Config.Categories > 0 then
        for _, cat in ipairs(Config.Categories) do
            if cat.id == catId then
                return cat
            end
        end
    end
    -- Fallback
    return nil
end

-- String Helper
local function trim(str)
    if type(str) ~= 'string' then return '' end
    return (str:gsub('^%s*(.-)%s*$', '%1'))
end

-- Primären Identifier des Spielers ermitteln (z.B. license)
local function getPlayerIdentifier(src)
    for i = 0, GetNumPlayerIdentifiers(src) - 1 do
        local id = GetPlayerIdentifier(src, i)
        if id and string.sub(id, 1, 8) == 'license:' then
            return id
        end
    end
    return GetPlayerIdentifier(src, 0) or ('id:' .. tostring(src))
end

-- Standalone Custom Benachrichtigung an Spieler senden
local function sendNotification(src, message, notifyType, title, duration)
    if not src or src <= 0 then return end
    TriggerClientEvent('flaytex_support:client:notify', src, message, title or 'FLAYTEX Support', notifyType or 'info', duration or (Config.Notifications and Config.Notifications.Duration) or 5000)
end

-- Export für externe Scripts
exports('Notify', function(src, message, notifyType, title, duration)
    sendNotification(src, message, notifyType, title, duration)
end)

-- Alle relevanten Identifiers für Logs abrufen
local function getDetailedIdentifiers(src)
    local ids = {
        license = 'N/A',
        discord = 'N/A',
        steam = 'N/A'
    }
    for i = 0, GetNumPlayerIdentifiers(src) - 1 do
        local id = GetPlayerIdentifier(src, i)
        if id then
            if string.sub(id, 1, 8) == 'license:' then
                ids.license = id
            elseif string.sub(id, 1, 8) == 'discord:' then
                ids.discord = string.sub(id, 9)
            elseif string.sub(id, 1, 6) == 'steam:' then
                ids.steam = id
            end
        end
    end
    return ids
end

-- ========================================================
-- Discord Webhook Logger (Reines Logging via Webhook)
-- Clean Markdown & Codeblock Formatting
-- ========================================================
local function sendDiscordLog(eventType, title, description, fields, customColor)
    local discordCfg = Config.DiscordLogs or Config.Discord
    if not discordCfg or not discordCfg.Enabled then return end

    local webhook = discordCfg.Webhook
    if not webhook or type(webhook) ~= 'string' then return end

    -- Whitespace bereinigen
    webhook = (webhook:gsub('^%s*(.-)%s*$', '%1'))
    if webhook == '' or string.find(webhook, 'DEIN_DISCORD_WEBHOOK') then return end

    if discordCfg.Events and discordCfg.Events[eventType] == false then
        return
    end

    local embedColor = customColor
    if not embedColor and discordCfg.Colors and discordCfg.Colors[eventType] then
        embedColor = discordCfg.Colors[eventType]
    end
    embedColor = embedColor or 16547587

    -- Sichere Fields-Validierung (Discord API crasht bei leeren Strings oder ungültigen Werten)
    local validFields = {}
    if fields and type(fields) == 'table' then
        for _, f in ipairs(fields) do
            if f and f.name and f.value then
                local fName = tostring(f.name)
                local fVal = tostring(f.value)
                if fName == '' then fName = '-' end
                if fVal == '' then fVal = '-' end
                table.insert(validFields, {
                    name = fName,
                    value = fVal,
                    inline = (f.inline == true)
                })
            end
        end
    end

    local embed = {
        title = title or 'FLAYTEX Support Log',
        color = embedColor,
        fields = validFields,
        footer = {
            text = 'FLAYTEX Support • ' .. os.date('%d.%m.%Y - %H:%M:%S')
        }
    }

    if description and type(description) == 'string' and #description > 0 then
        embed.description = description
    end

    if discordCfg.BotAvatar and type(discordCfg.BotAvatar) == 'string' and #discordCfg.BotAvatar > 7 and string.sub(discordCfg.BotAvatar, 1, 4) == 'http' then
        embed.footer.icon_url = discordCfg.BotAvatar
    end

    local payload = {
        username = discordCfg.BotName or 'FLAYTEX Support Logs',
        embeds = { embed }
    }

    if discordCfg.BotAvatar and type(discordCfg.BotAvatar) == 'string' and #discordCfg.BotAvatar > 7 and string.sub(discordCfg.BotAvatar, 1, 4) == 'http' then
        payload.avatar_url = discordCfg.BotAvatar
    end

    PerformHttpRequest(webhook, function(statusCode, responseText, headers)
        if statusCode == 200 or statusCode == 204 then
            -- Erfolgreich gesendet
        else
            print(string.format('^1[flaytex_support] Discord Webhook ERROR! HTTP-Status: %s - Antwort: %s^0', tostring(statusCode), tostring(responseText)))
        end
    end, 'POST', json.encode(payload), {
        ['Content-Type'] = 'application/json'
    })
end

-- Befehl zum sofortigen Testen des Webhooks (/supporttestwebhook)
RegisterCommand('supporttestwebhook', function(source, args)
    if source > 0 and not IsPlayerAdmin(source) then
        sendNotification(source, _U('no_permission'), 'error')
        return
    end

    local sender = source > 0 and string.format('%s (ID %s)', GetPlayerName(source), source) or 'Server-Konsole'
    print('^3[flaytex_support]^0 Sending Test-Log to Discord Webhook...')

    local testColor = (Config.DiscordLogs and Config.DiscordLogs.Colors and Config.DiscordLogs.Colors.TicketClosed) or 65280
    sendDiscordLog('TicketCreated', _U('discord_test_title'), '> ' .. _U('discord_test_desc'), {
        { name = _U('discord_field_status'), value = '`Aktiv & Erfolgreich verbunden`', inline = true },
        { name = _U('discord_field_executed_by'), value = string.format('`%s`', sender), inline = true }
    }, testColor)

    if source > 0 then
        sendNotification(source, _U('test_log_sent'), 'success')
    else
        print('^2[flaytex_support]^0 ' .. _U('test_log_sent'))
    end
end, false)

-- Startup-Check für Discord Webhook
AddEventHandler('onResourceStart', function(resourceName)
    if resourceName ~= GetCurrentResourceName() then return end

    local discordCfg = Config.DiscordLogs or Config.Discord
    if discordCfg and discordCfg.Enabled then
        local webhook = discordCfg.Webhook and (discordCfg.Webhook:gsub('^%s*(.-)%s*$', '%1'))
        if webhook and webhook ~= '' and not string.find(webhook, 'DEIN_DISCORD_WEBHOOK') then
            print('^2[flaytex_support]^0 Discord Webhook Logs activated! Use ^3/supporttestwebhook^0 for testing.')
        else
            print('^3[flaytex_support]^0 Discord Webhook isnt configured.^0')
        end
    end
end)

-- Admin-Berechtigung serverseitig prüfen
function IsPlayerAdmin(src)
    if not src or src <= 0 then return false end

    -- 1. ACE Permissions Check
    if Config.Admin.UseAce and Config.Admin.AcePermission then
        if IsPlayerAceAllowed(src, Config.Admin.AcePermission) then
            return true
        end
    end

    -- 2. Identifier Allowlist Check
    if Config.Admin.Identifiers and #Config.Admin.Identifiers > 0 then
        local playerIds = {}
        for i = 0, GetNumPlayerIdentifiers(src) - 1 do
            local id = GetPlayerIdentifier(src, i)
            if id then
                playerIds[string.lower(id)] = true
            end
        end

        for _, allowedId in ipairs(Config.Admin.Identifiers) do
            if playerIds[string.lower(allowedId)] then
                return true
            end
        end
    end

    return false
end

-- Statistiken berechnen
local function getTicketCounts()
    local counts = {
        open = 0,
        progress = 0,
        waiting = 0,
        closed = 0
    }

    for _, ticket in pairs(tickets) do
        if counts[ticket.status] ~= nil then
            counts[ticket.status] = counts[ticket.status] + 1
        end
    end

    return counts
end

-- Ticket-Liste als sortiertes Array für das NUI
local function getTicketList()
    local list = {}
    for _, t in pairs(tickets) do
        table.insert(list, t)
    end
    table.sort(list, function(a, b)
        return (a.createdAt or 0) > (b.createdAt or 0)
    end)
    return list
end

-- Alle berechtigten Admins live synchronisieren
local function syncAdmins()
    local counts = getTicketCounts()
    local list = getTicketList()

    for _, playerId in ipairs(GetPlayers()) do
        local pSrc = tonumber(playerId)
        if pSrc and IsPlayerAdmin(pSrc) then
            TriggerClientEvent('flaytex_support:client:syncTickets', pSrc, list, counts)
        end
    end
end

-- ========================================================
-- Spieler öffnet /support: Prüfen ob ein aktives Ticket existiert
-- ========================================================
RegisterNetEvent('flaytex_support:server:requestPlayerSupport', function()
    local src = source
    if not src or src <= 0 then return end

    local identifier = getPlayerIdentifier(src)
    local activeTicket = nil

    -- Suche nach aktivem Ticket des Spielers (Status != 'closed')
    for _, t in pairs(tickets) do
        if (t.authorIdentifier == identifier or t.authorId == src) and t.status ~= 'closed' then
            if not activeTicket or (t.createdAt or 0) > (activeTicket.createdAt or 0) then
                activeTicket = t
            end
        end
    end

    if activeTicket then
        -- Session-ID aktualisieren falls Spieler reconnected ist
        activeTicket.authorId = src
        TriggerClientEvent('flaytex_support:client:openPlayerTicket', src, activeTicket)
    else
        TriggerClientEvent('flaytex_support:client:openSupportCreate', src)
    end
end)

-- ========================================================
-- Ticket-Einreichung: Vollständige Server-Validierung
-- ========================================================
RegisterNetEvent('flaytex_support:server:submitTicket', function(payload)
    local src = source
    if not src or src <= 0 then return end

    -- 1. Payload-Typ prüfen
    if type(payload) ~= 'table' then
        TriggerClientEvent('flaytex_support:client:submitTicketResponse', src, false, _U('invalid_category'))
        return
    end

    local identifier = getPlayerIdentifier(src)

    -- 2. Prüfen, ob der Spieler bereits ein offenes Ticket hat
    for _, t in pairs(tickets) do
        if (t.authorIdentifier == identifier or t.authorId == src) and t.status ~= 'closed' then
            local msg = _U('ticket_already_open', t.id)
            TriggerClientEvent('flaytex_support:client:submitTicketResponse', src, false, msg)
            sendNotification(src, msg, 'error')
            return
        end
    end

    -- 3. Spamschutz / Cooldown prüfen
    local now = os.time()
    local cooldown = (Config.Ticket and Config.Ticket.CooldownSeconds) or 30

    if playerCooldowns[identifier] and (now - playerCooldowns[identifier]) < cooldown then
        local remaining = cooldown - (now - playerCooldowns[identifier])
        TriggerClientEvent('flaytex_support:client:submitTicketResponse', src, false, _U('cooldown_wait', remaining))
        return
    end

    -- 4. Dynamische Kategorie-Prüfung anhand von Config.Categories
    local category = payload.category
    local catInfo = getCategoryInfo(category)
    if not catInfo then
        TriggerClientEvent('flaytex_support:client:submitTicketResponse', src, false, _U('invalid_category'))
        return
    end

    -- 5. Betreff prüfen (Länge & Bereinigung)
    local subject = trim(payload.subject)
    local minSub = (Config.Ticket and Config.Ticket.MinSubjectLength) or 3
    local maxSub = (Config.Ticket and Config.Ticket.MaxSubjectLength) or 60
    if #subject < minSub or #subject > maxSub then
        TriggerClientEvent('flaytex_support:client:submitTicketResponse', src, false, _U('subject_length', minSub, maxSub))
        return
    end

    -- 6. Nachricht prüfen (Länge & Bereinigung)
    local message = trim(payload.message)
    local minMsg = (Config.Ticket and Config.Ticket.MinMessageLength) or 5
    local maxMsg = (Config.Ticket and Config.Ticket.MaxMessageLength) or 500
    if #message < minMsg or #message > maxMsg then
        TriggerClientEvent('flaytex_support:client:submitTicketResponse', src, false, _U('message_length', minMsg, maxMsg))
        return
    end

    -- 7. Falls Kategorie requireTarget hat: Gemeldeten Spieler validieren
    local targetData = nil
    if catInfo.requireTarget then
        local targetId = tonumber(payload.target)
        if not targetId or targetId <= 0 then
            TriggerClientEvent('flaytex_support:client:submitTicketResponse', src, false, _U('invalid_target_id'))
            return
        end

        if targetId == src then
            TriggerClientEvent('flaytex_support:client:submitTicketResponse', src, false, _U('target_self'))
            return
        end

        local targetName = GetPlayerName(targetId)
        if not targetName then
            TriggerClientEvent('flaytex_support:client:submitTicketResponse', src, false, _U('target_offline'))
            return
        end

        targetData = {
            id = targetId,
            name = targetName
        }
    end

    -- 8. ECHTE Server-Koordinaten ermitteln (niemals Client-Koordinaten vertrauen)
    local serverCoords = nil
    if payload.position == true then
        local ped = GetPlayerPed(src)
        if DoesEntityExist(ped) then
            local pos = GetEntityCoords(ped)
            serverCoords = {
                x = math.floor(pos.x * 100) / 100,
                y = math.floor(pos.y * 100) / 100,
                z = math.floor(pos.z * 100) / 100
            }
        end
    end

    -- 9. Ticket auf dem Server anlegen
    nextTicketId = nextTicketId + 1
    local ticketId = nextTicketId
    local playerName = GetPlayerName(src) or 'Unknown'
    local catLocKey = 'category_' .. category
    local catLabel = (_U(catLocKey) ~= catLocKey and _U(catLocKey)) or catInfo.label or category

    local newTicket = {
        id = ticketId,
        author = playerName,
        authorId = src,
        authorIdentifier = identifier,
        category = category,
        categoryLabel = catLabel,
        target = targetData,
        subject = subject,
        message = message,
        coords = serverCoords,
        status = 'open',
        claimedBy = nil,
        createdAt = now,
        messages = {
            {
                sender = playerName,
                senderId = src,
                isTeam = false,
                text = message,
                time = now
            }
        }
    }

    tickets[ticketId] = newTicket
    playerCooldowns[identifier] = now

    print(string.format('^2[flaytex_support]^0 New Ticket #%d from ^3%s (ID %s)^0: [%s] %s', ticketId, playerName, src, catLabel, subject))

    -- Bestätigung mit der echten Server-Ticket-ID an den Client
    TriggerClientEvent('flaytex_support:client:submitTicketResponse', src, true, { id = ticketId, ticketId = ticketId })
    sendNotification(src, _U('ticket_created_success', ticketId), 'success')

    -- Alle Admins über das neue Ticket benachrichtigen
    for _, playerId in ipairs(GetPlayers()) do
        local pSrc = tonumber(playerId)
        if pSrc and IsPlayerAdmin(pSrc) then
            sendNotification(pSrc, _U('ticket_new_from_player', ticketId, playerName, subject), 'info', 'FLAYTEX Support')
        end
    end

    -- Discord Webhook Log (Clean Markdown & Codeblock Design)
    local ids = getDetailedIdentifiers(src)
    local discordMention = ids.discord ~= 'N/A' and ('<@' .. ids.discord .. '>') or '`N/A`'

    local fields = {
        { name = _U('discord_field_creator'), value = string.format('`%s (ID: %s)`', playerName, src), inline = true },
        { name = _U('discord_field_category'), value = string.format('`%s`', catLabel), inline = true },
        { name = _U('discord_field_license'), value = string.format('`%s`', ids.license), inline = false },
        { name = _U('discord_field_discord'), value = discordMention, inline = true }
    }

    if targetData then
        table.insert(fields, { name = _U('discord_field_target'), value = string.format('`%s (ID: %s)`', targetData.name, targetData.id), inline = true })
    end

    if serverCoords then
        table.insert(fields, { name = _U('discord_field_coords'), value = string.format('`X: %.2f | Y: %.2f | Z: %.2f`', serverCoords.x, serverCoords.y, serverCoords.z), inline = true })
    end

    table.insert(fields, { name = _U('discord_field_subject'), value = string.format('`%s`', subject), inline = false })
    table.insert(fields, { name = _U('discord_field_description'), value = string.format('```\n%s\n```', message), inline = false })

    local embedColor = (Config.DiscordLogs and Config.DiscordLogs.Colors and Config.DiscordLogs.Colors.TicketCreated) or 16547587
    sendDiscordLog('TicketCreated', _U('discord_ticket_created_title', ticketId), '> ' .. _U('discord_ticket_created_desc'), fields, embedColor)

    -- Admins synchronisieren
    syncAdmins()
end)

-- ========================================================
-- Spieler antwortet in seinem Ticket
-- ========================================================
RegisterNetEvent('flaytex_support:server:playerReplyTicket', function(ticketId, replyText)
    local src = source
    if not src or src <= 0 then return end

    ticketId = tonumber(ticketId)
    local ticket = tickets[ticketId]
    if not ticket then
        sendNotification(src, _U('ticket_not_found'), 'error')
        return
    end

    local identifier = getPlayerIdentifier(src)
    if ticket.authorIdentifier ~= identifier and ticket.authorId ~= src then
        sendNotification(src, _U('not_ticket_owner'), 'error')
        return
    end

    if ticket.status == 'closed' then
        sendNotification(src, _U('ticket_already_closed'), 'error')
        return
    end

    replyText = trim(replyText)
    local minMsg = (Config.Ticket and Config.Ticket.MinMessageLength) or 1
    local maxMsg = (Config.Ticket and Config.Ticket.MaxMessageLength) or 500
    if #replyText < minMsg or #replyText > maxMsg then
        sendNotification(src, _U('reply_length', minMsg, maxMsg), 'error')
        return
    end

    local playerName = GetPlayerName(src) or ticket.author
    table.insert(ticket.messages, {
        sender = playerName,
        senderId = src,
        isTeam = false,
        text = replyText,
        time = os.time()
    })

    -- Status anpassen
    if ticket.claimedBy then
        ticket.status = 'progress'
    else
        ticket.status = 'open'
    end

    -- Spieler UI sofort aktualisieren
    TriggerClientEvent('flaytex_support:client:updatePlayerTicket', src, ticket)
    sendNotification(src, _U('reply_sent_player'), 'success')

    -- Bearbeiter oder alle Admins informieren
    if ticket.claimedBy and ticket.claimedBy.id then
        local adminPed = GetPlayerPed(ticket.claimedBy.id)
        if DoesEntityExist(adminPed) then
            sendNotification(ticket.claimedBy.id, _U('ticket_reply_from_team', ticket.id, playerName, replyText), 'info', 'Ticket Antwort')
        end
    else
        for _, playerId in ipairs(GetPlayers()) do
            local pSrc = tonumber(playerId)
            if pSrc and IsPlayerAdmin(pSrc) then
                sendNotification(pSrc, string.format('[Ticket #%d] %s: %s', ticket.id, playerName, replyText), 'info', 'FLAYTEX Support')
            end
        end
    end

    -- Discord Webhook Log (Clean Markdown)
    local replyColor = (Config.DiscordLogs and Config.DiscordLogs.Colors and Config.DiscordLogs.Colors.TicketReply) or 3447003
    sendDiscordLog('TicketReply', _U('discord_ticket_reply_title', ticket.id), '> ' .. _U('discord_ticket_reply_desc'), {
        { name = _U('discord_field_sender'), value = string.format('`%s (ID: %s)` [%s]', playerName, src, _U('discord_player_label')), inline = true },
        { name = _U('discord_field_subject'), value = string.format('`%s`', ticket.subject), inline = true },
        { name = _U('discord_field_message'), value = string.format('```\n%s\n```', replyText), inline = false }
    }, replyColor)

    syncAdmins()
end)

-- ========================================================
-- Spieler schließt sein eigenes Ticket
-- ========================================================
RegisterNetEvent('flaytex_support:server:playerCloseTicket', function(ticketId)
    local src = source
    if not src or src <= 0 then return end

    ticketId = tonumber(ticketId)
    local ticket = tickets[ticketId]
    if not ticket then return end

    local identifier = getPlayerIdentifier(src)
    if ticket.authorIdentifier ~= identifier and ticket.authorId ~= src then
        sendNotification(src, _U('not_ticket_owner'), 'error')
        return
    end

    if ticket.status == 'closed' then
        sendNotification(src, _U('ticket_already_closed'), 'info')
        TriggerClientEvent('flaytex_support:client:closeUI', src)
        return
    end

    ticket.status = 'closed'
    ticket.closedAt = os.time()

    table.insert(ticket.messages, {
        isSystem = true,
        text = _U('ticket_closed_player', ticket.id),
        time = os.time()
    })

    TriggerClientEvent('flaytex_support:client:closeUI', src)
    sendNotification(src, _U('ticket_closed_player', ticket.id), 'info')

    if ticket.claimedBy and ticket.claimedBy.id then
        local adminPed = GetPlayerPed(ticket.claimedBy.id)
        if DoesEntityExist(adminPed) then
            sendNotification(ticket.claimedBy.id, _U('ticket_closed_player', ticket.id), 'info', 'FLAYTEX Support')
        end
    end

    -- Discord Log (Clean Markdown)
    local closedColor = (Config.DiscordLogs and Config.DiscordLogs.Colors and Config.DiscordLogs.Colors.TicketClosed) or 65280
    sendDiscordLog('TicketClosed', _U('discord_ticket_closed_title', ticket.id), '> ' .. _U('discord_ticket_closed_desc'), {
        { name = _U('discord_field_closed_by'), value = string.format('`%s (ID: %s)` [%s]', ticket.author, src, _U('discord_player_label')), inline = true },
        { name = _U('discord_field_creator'), value = string.format('`%s (ID: %s)`', ticket.author, src), inline = true },
        { name = _U('discord_field_subject'), value = string.format('`%s`', ticket.subject), inline = false }
    }, closedColor)

    syncAdmins()
end)

-- ========================================================
-- Admin UI: Zugriff prüfen und vollständige Ticketliste liefern
-- ========================================================
RegisterNetEvent('flaytex_support:server:requestAdminOpen', function()
    local src = source
    if not src or src <= 0 then return end

    if not IsPlayerAdmin(src) then
        print(string.format('^1[flaytex_support]^0 Unauthorized access attempt to /supportadmin by %s (ID %s)', GetPlayerName(src) or 'Unknown', src))
        sendNotification(src, _U('no_permission'), 'error')
        return
    end

    local adminData = {
        name = GetPlayerName(src),
        id = src,
        counts = getTicketCounts(),
        tickets = getTicketList()
    }

    TriggerClientEvent('flaytex_support:client:openAdmin', src, adminData)
end)

-- Admin fordert manuelle Aktualisierung an (z.B. Refresh-Button)
RegisterNetEvent('flaytex_support:server:requestTickets', function()
    local src = source
    if not src or src <= 0 or not IsPlayerAdmin(src) then return end

    TriggerClientEvent('flaytex_support:client:syncTickets', src, getTicketList(), getTicketCounts())
end)

-- ========================================================
-- Ticket-Aktionen (Admin)
-- ========================================================

-- Ticket übernehmen
RegisterNetEvent('flaytex_support:server:claimTicket', function(ticketId)
    local src = source
    if not src or src <= 0 or not IsPlayerAdmin(src) then return end

    ticketId = tonumber(ticketId)
    local ticket = tickets[ticketId]
    if not ticket then return end

    local adminName = GetPlayerName(src) or 'Admin'
    ticket.status = 'progress'
    ticket.claimedBy = { id = src, name = adminName }

    table.insert(ticket.messages, {
        isSystem = true,
        text = string.format('%s: %s', _U('discord_field_claimed_by'), adminName),
        time = os.time()
    })

    sendNotification(src, _U('ticket_claimed_admin', ticketId), 'success')

    -- Ersteller benachrichtigen & sein UI aktualisieren falls geöffnet
    if ticket.authorId and DoesEntityExist(GetPlayerPed(ticket.authorId)) then
        sendNotification(ticket.authorId, _U('ticket_claimed_player', ticketId, adminName), 'info')
        TriggerClientEvent('flaytex_support:client:updatePlayerTicket', ticket.authorId, ticket)
    end

    -- Discord Log (Clean Markdown)
    local claimColor = (Config.DiscordLogs and Config.DiscordLogs.Colors and Config.DiscordLogs.Colors.TicketClaimed) or 15258700
    sendDiscordLog('TicketClaimed', _U('discord_ticket_claimed_title', ticketId), '> ' .. _U('discord_ticket_claimed_desc'), {
        { name = _U('discord_field_claimed_by'), value = string.format('`%s (ID: %s)`', adminName, src), inline = true },
        { name = _U('discord_field_creator'), value = string.format('`%s (ID: %s)`', ticket.author, ticket.authorId), inline = true },
        { name = _U('discord_field_subject'), value = string.format('`%s`', ticket.subject), inline = false }
    }, claimColor)

    syncAdmins()
end)

-- Ticket schließen
RegisterNetEvent('flaytex_support:server:closeTicket', function(ticketId)
    local src = source
    if not src or src <= 0 or not IsPlayerAdmin(src) then return end

    ticketId = tonumber(ticketId)
    local ticket = tickets[ticketId]
    if not ticket then return end

    local adminName = GetPlayerName(src) or 'Admin'
    ticket.status = 'closed'
    ticket.closedAt = os.time()

    table.insert(ticket.messages, {
        isSystem = true,
        text = string.format('%s: %s', _U('discord_field_closed_by'), adminName),
        time = os.time()
    })

    sendNotification(src, _U('ticket_closed_admin', ticketId), 'info')

    -- Ersteller benachrichtigen & sein UI aktualisieren falls geöffnet
    if ticket.authorId and DoesEntityExist(GetPlayerPed(ticket.authorId)) then
        sendNotification(ticket.authorId, _U('ticket_closed_admin', ticketId), 'info')
        TriggerClientEvent('flaytex_support:client:updatePlayerTicket', ticket.authorId, ticket)
    end

    -- Discord Log (Clean Markdown)
    local closedColor = (Config.DiscordLogs and Config.DiscordLogs.Colors and Config.DiscordLogs.Colors.TicketClosed) or 65280
    sendDiscordLog('TicketClosed', _U('discord_ticket_closed_title', ticketId), '> ' .. _U('discord_ticket_closed_desc'), {
        { name = _U('discord_field_closed_by'), value = string.format('`%s (ID: %s)` [%s]', adminName, src, _U('discord_team_label')), inline = true },
        { name = _U('discord_field_creator'), value = string.format('`%s (ID: %s)`', ticket.author, ticket.authorId), inline = true },
        { name = _U('discord_field_subject'), value = string.format('`%s`', ticket.subject), inline = false }
    }, closedColor)

    syncAdmins()
end)

-- Antwort verfassen (Admin)
RegisterNetEvent('flaytex_support:server:replyTicket', function(ticketId, replyText)
    local src = source
    if not src or src <= 0 or not IsPlayerAdmin(src) then return end

    ticketId = tonumber(ticketId)
    local ticket = tickets[ticketId]
    if not ticket then return end

    replyText = trim(replyText)
    local minMsg = (Config.Ticket and Config.Ticket.MinMessageLength) or 1
    local maxMsg = (Config.Ticket and Config.Ticket.MaxMessageLength) or 500
    if #replyText < minMsg or #replyText > maxMsg then
        sendNotification(src, _U('reply_length', minMsg, maxMsg), 'error')
        return
    end

    local adminName = GetPlayerName(src) or 'Admin'
    table.insert(ticket.messages, {
        sender = adminName,
        senderId = src,
        isTeam = true,
        text = replyText,
        time = os.time()
    })

    -- Status auf "waiting" (Wartet auf Spieler) ändern
    ticket.status = 'waiting'

    sendNotification(src, _U('reply_sent_admin', ticketId), 'success')

    -- Ersteller benachrichtigen & sein UI aktualisieren falls geöffnet
    if ticket.authorId and DoesEntityExist(GetPlayerPed(ticket.authorId)) then
        sendNotification(ticket.authorId, _U('ticket_reply_from_team', ticketId, adminName, replyText), 'info', 'FLAYTEX Support')
        TriggerClientEvent('flaytex_support:client:updatePlayerTicket', ticket.authorId, ticket)
    end

    -- Discord Log (Clean Markdown)
    local replyColor = (Config.DiscordLogs and Config.DiscordLogs.Colors and Config.DiscordLogs.Colors.TicketReply) or 3447003
    sendDiscordLog('TicketReply', _U('discord_ticket_reply_title', ticketId), '> ' .. _U('discord_ticket_reply_desc'), {
        { name = _U('discord_field_sender'), value = string.format('`%s (ID: %s)` [%s]', adminName, src, _U('discord_team_label')), inline = true },
        { name = _U('discord_field_creator'), value = string.format('`%s (ID: %s)`', ticket.author, ticket.authorId), inline = true },
        { name = _U('discord_field_subject'), value = string.format('`%s`', ticket.subject), inline = false },
        { name = _U('discord_field_message'), value = string.format('```\n%s\n```', replyText), inline = false }
    }, replyColor)

    syncAdmins()
end)

-- Zum Spieler teleportieren
RegisterNetEvent('flaytex_support:server:gotoPlayer', function(ticketId)
    local src = source
    if not src or src <= 0 or not IsPlayerAdmin(src) then return end

    ticketId = tonumber(ticketId)
    local ticket = tickets[ticketId]
    if not ticket then return end

    local adminPed = GetPlayerPed(src)
    if not DoesEntityExist(adminPed) then return end

    local targetPed = GetPlayerPed(ticket.authorId)
    if DoesEntityExist(targetPed) then
        local targetCoords = GetEntityCoords(targetPed)
        SetEntityCoords(adminPed, targetCoords.x, targetCoords.y, targetCoords.z, false, false, false, false)
        sendNotification(src, _U('teleport_to_player', ticket.author, ticket.authorId), 'success')

        local teleColor = (Config.DiscordLogs and Config.DiscordLogs.Colors and Config.DiscordLogs.Colors.AdminTeleport) or 10181046
        sendDiscordLog('AdminTeleport', _U('discord_teleport_title', ticketId), '> ' .. _U('discord_teleport_desc'), {
            { name = _U('discord_field_executed_by'), value = string.format('`%s (ID: %s)`', GetPlayerName(src) or 'Admin', src), inline = true },
            { name = _U('discord_field_target'), value = string.format('`%s (ID: %s)`', ticket.author, ticket.authorId), inline = true },
            { name = _U('discord_field_action'), value = '`Goto (Teleport to Player)`', inline = true }
        }, teleColor)
    elseif ticket.coords then
        SetEntityCoords(adminPed, ticket.coords.x, ticket.coords.y, ticket.coords.z, false, false, false, false)
        sendNotification(src, _U('teleport_to_coords'), 'info')
    else
        sendNotification(src, _U('teleport_no_coords'), 'error')
    end
end)

-- Spieler herholen
RegisterNetEvent('flaytex_support:server:bringPlayer', function(ticketId)
    local src = source
    if not src or src <= 0 or not IsPlayerAdmin(src) then return end

    ticketId = tonumber(ticketId)
    local ticket = tickets[ticketId]
    if not ticket then return end

    local adminPed = GetPlayerPed(src)
    if not DoesEntityExist(adminPed) then return end

    local targetPed = GetPlayerPed(ticket.authorId)
    if DoesEntityExist(targetPed) then
        local adminCoords = GetEntityCoords(adminPed)
        SetEntityCoords(targetPed, adminCoords.x, adminCoords.y, adminCoords.z, false, false, false, false)
        local adminName = GetPlayerName(src) or 'Admin'
        sendNotification(src, _U('bring_success', ticket.author, ticket.authorId), 'success')
        sendNotification(ticket.authorId, _U('bring_notify_player', adminName), 'info')

        local teleColor = (Config.DiscordLogs and Config.DiscordLogs.Colors and Config.DiscordLogs.Colors.AdminTeleport) or 10181046
        sendDiscordLog('AdminTeleport', _U('discord_teleport_title', ticketId), '> ' .. _U('discord_teleport_desc'), {
            { name = _U('discord_field_executed_by'), value = string.format('`%s (ID: %s)`', adminName, src), inline = true },
            { name = _U('discord_field_target'), value = string.format('`%s (ID: %s)`', ticket.author, ticket.authorId), inline = true },
            { name = _U('discord_field_action'), value = '`Bring (Teleport Player to Admin)`', inline = true }
        }, teleColor)
    else
        sendNotification(src, _U('player_offline'), 'error')
    end
end)
