-- ========================================================
-- FLAYTEX Support - Standalone Client Logic
-- ========================================================

Config = Config or {}

local supportCommand = (Config and Config.SupportCommand) or 'support'
local adminCommand = (Config and Config.AdminCommand) or 'supportadmin'
local currentView = nil -- nil | 'report' | 'my-ticket' | 'admin'

local function closeUI()
    if not currentView then return end
    currentView = nil
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'close' })
end

-- ========================================================
-- Theme & Locale Synchronisation
-- ========================================================
local function syncTheme()
    local localeTable = (type(GetLocaleTable) == 'function') and GetLocaleTable() or {}
    SendNUIMessage({
        action = 'setTheme',
        theme = Config.Theme,
        categories = Config.Categories,
        locale = localeTable
    })
end

-- ========================================================
-- Custom Standalone Toast Notifications (Top Left)
-- ========================================================
local function showNotification(message, title, notifyType, duration)
    if not message or message == '' then return end

    title = title or 'FLAYTEX Support'
    notifyType = notifyType or 'info'
    duration = tonumber(duration) or (Config.Notifications and Config.Notifications.Duration) or 5000

    -- Theme & Locale sicherstellen
    syncTheme()

    SendNUIMessage({
        action = 'notify',
        title = title,
        message = message,
        type = notifyType,
        duration = duration
    })

    -- Optionaler GTA Native Feed Fallback
    if Config.Notifications and Config.Notifications.EnableFeedFallback then
        pcall(function()
            BeginTextCommandThefeedPost('STRING')
            AddTextComponentSubstringPlayerName(string.format('[%s] %s', title, message))
            EndTextCommandThefeedPostTicker(false, true)
        end)
    end
end

RegisterNetEvent('flaytex_support:client:notify', function(message, title, notifyType, duration)
    showNotification(message, title, notifyType, duration)
end)

exports('Notify', function(message, title, notifyType, duration)
    showNotification(message, title, notifyType, duration)
end)

-- ========================================================
-- Befehl /support: Prüft beim Server, ob bereits ein Ticket offen ist
-- ========================================================
RegisterCommand(supportCommand, function()
    if currentView then
        closeUI()
        return
    end

    -- Server fragt nach aktivem Ticket des Spielers
    TriggerServerEvent('flaytex_support:server:requestPlayerSupport')
end, false)

-- Fallback für 'support' falls Command umbenannt wurde
if supportCommand ~= 'support' then
    RegisterCommand('support', function()
        ExecuteCommand(supportCommand)
    end, false)
end

if Config.SupportDefaultKey and Config.SupportDefaultKey ~= '' then
    RegisterKeyMapping(supportCommand, 'Support Ticket', 'keyboard', Config.SupportDefaultKey)
end

-- ========================================================
-- Befehl /supportadmin: Fordert Zugriff beim Server an
-- ========================================================
RegisterCommand(adminCommand, function()
    if currentView == 'admin' then
        closeUI()
        return
    end

    TriggerServerEvent('flaytex_support:server:requestAdminOpen')
end, false)

if adminCommand ~= 'supportadmin' then
    RegisterCommand('supportadmin', function()
        ExecuteCommand(adminCommand)
    end, false)
end

if Config.AdminDefaultKey and Config.AdminDefaultKey ~= '' then
    RegisterKeyMapping(adminCommand, 'Support Admin Dashboard', 'keyboard', Config.AdminDefaultKey)
end

-- Chat Autocomplete / Suggestions
Citizen.CreateThread(function()
    local suppHelp = (type(_U) == 'function') and _U('command_support_help') or 'Support-Ticket erstellen oder aktives Ticket ansehen'
    local adminHelp = (type(_U) == 'function') and _U('command_admin_help') or 'Support Admin Dashboard öffnen'

    TriggerEvent('chat:addSuggestion', '/' .. supportCommand, suppHelp)
    TriggerEvent('chat:addSuggestion', '/' .. adminCommand, adminHelp)
    syncTheme()
end)

-- ========================================================
-- UI Event Handler (Server -> Client)
-- ========================================================

-- Spieler hat kein aktives Ticket: Erstellungs-UI öffnen
RegisterNetEvent('flaytex_support:client:openSupportCreate', function()
    currentView = 'report'
    syncTheme()
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = 'open',
        view = 'report',
        theme = Config.Theme,
        categories = Config.Categories,
        locale = (type(GetLocaleTable) == 'function') and GetLocaleTable() or {}
    })
end)

-- Spieler hat bereits ein aktives Ticket: Spieler-Ticket-UI öffnen
RegisterNetEvent('flaytex_support:client:openPlayerTicket', function(ticket)
    if not ticket then return end

    currentView = 'my-ticket'
    syncTheme()
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = 'open',
        view = 'myTicket',
        ticket = ticket,
        theme = Config.Theme,
        categories = Config.Categories,
        locale = (type(GetLocaleTable) == 'function') and GetLocaleTable() or {}
    })
end)

-- Ticket aktualisieren (z.B. neue Nachricht oder Statusänderung)
RegisterNetEvent('flaytex_support:client:updatePlayerTicket', function(ticket)
    if not ticket then return end

    SendNUIMessage({
        action = 'updateMyTicket',
        ticket = ticket
    })
end)

-- UI von Serverseite schließen
RegisterNetEvent('flaytex_support:client:closeUI', function()
    closeUI()
end)

-- Server hat Admin-Zugriff autorisiert: Admin-UI mit Tickets öffnen
RegisterNetEvent('flaytex_support:client:openAdmin', function(adminData)
    if not adminData then return end

    currentView = 'admin'
    syncTheme()
    SetNuiFocus(true, true)

    SendNUIMessage({
        action = 'open',
        view = 'admin',
        theme = Config.Theme,
        categories = Config.Categories,
        locale = (type(GetLocaleTable) == 'function') and GetLocaleTable() or {},
        user = {
            name = adminData.name or 'Admin',
            id = adminData.id or 0
        }
    })

    if adminData.counts then
        SendNUIMessage({
            action = 'counts',
            counts = adminData.counts
        })
    end

    if adminData.tickets then
        SendNUIMessage({
            action = 'setTickets',
            tickets = adminData.tickets
        })
    end
end)

-- Live-Synchronisation für Admins
RegisterNetEvent('flaytex_support:client:syncTickets', function(tickets, counts)
    if currentView == 'admin' then
        if counts then
            SendNUIMessage({
                action = 'counts',
                counts = counts
            })
        end

        if tickets then
            SendNUIMessage({
                action = 'setTickets',
                tickets = tickets
            })
        end
    end
end)

-- Server-Antwort auf Ticket-Einreichung an NUI übermitteln
RegisterNetEvent('flaytex_support:client:submitTicketResponse', function(success, resultOrMessage)
    if success then
        local ticketId = nil
        if type(resultOrMessage) == 'table' then
            ticketId = resultOrMessage.id or resultOrMessage.ticketId
        elseif type(resultOrMessage) == 'number' then
            ticketId = resultOrMessage
        elseif type(resultOrMessage) == 'string' and tonumber(resultOrMessage) then
            ticketId = tonumber(resultOrMessage)
        end
        ticketId = ticketId or 1000

        SendNUIMessage({
            action = 'ticketResult',
            success = true,
            id = ticketId,
            ticketId = ticketId
        })
    else
        SendNUIMessage({
            action = 'ticketResult',
            success = false,
            message = (type(resultOrMessage) == 'string' and resultOrMessage) or 'Ticket konnte nicht gesendet werden.'
        })
    end
end)

-- ========================================================
-- NUI Callbacks
-- ========================================================
RegisterNUICallback('close', function(_, cb)
    closeUI()
    cb('ok')
end)

-- Ticket-Einreichung (Spieler)
RegisterNUICallback('submit', function(data, cb)
    cb('ok')

    local payload = {
        category = data.category,
        target = data.target,
        subject = data.subject,
        message = data.message,
        position = (data.position == true)
    }

    TriggerServerEvent('flaytex_support:server:submitTicket', payload)
end)

-- Spieler schließt sein eigenes Ticket
RegisterNUICallback('playerCloseTicket', function(data, cb)
    cb('ok')
    if data and data.id then
        TriggerServerEvent('flaytex_support:server:playerCloseTicket', data.id)
    end
end)

-- Spieler antwortet im Ticket
RegisterNUICallback('playerReplyTicket', function(data, cb)
    cb('ok')
    if data and data.id and data.text then
        TriggerServerEvent('flaytex_support:server:playerReplyTicket', data.id, data.text)
    end
end)

-- Admin: Ticket übernehmen
RegisterNUICallback('claimTicket', function(data, cb)
    cb('ok')
    if data and data.id then
        TriggerServerEvent('flaytex_support:server:claimTicket', data.id)
    end
end)

-- Admin: Ticket schließen
RegisterNUICallback('closeTicket', function(data, cb)
    cb('ok')
    if data and data.id then
        TriggerServerEvent('flaytex_support:server:closeTicket', data.id)
    end
end)

-- Admin: Antwort verfassen
RegisterNUICallback('replyTicket', function(data, cb)
    cb('ok')
    if data and data.id and data.text then
        TriggerServerEvent('flaytex_support:server:replyTicket', data.id, data.text)
    end
end)

-- Admin: Zum Spieler / zu Koordinaten teleportieren
RegisterNUICallback('gotoPlayer', function(data, cb)
    cb('ok')
    if data and data.id then
        TriggerServerEvent('flaytex_support:server:gotoPlayer', data.id)
    end
end)

-- Admin: Spieler zu sich herholen
RegisterNUICallback('bringPlayer', function(data, cb)
    cb('ok')
    if data and data.id then
        TriggerServerEvent('flaytex_support:server:bringPlayer', data.id)
    end
end)

-- Admin: Liste manuell aktualisieren
RegisterNUICallback('refresh', function(_, cb)
    cb('ok')
    TriggerServerEvent('flaytex_support:server:requestTickets')
end)

-- Bereinigung bei Resource-Stop
AddEventHandler('onResourceStop', function(resource)
    if resource ~= GetCurrentResourceName() then return end

    if currentView then
        SetNuiFocus(false, false)
    end
end)

print('^2[flaytex_support]^0 Client initialisiert! Befehle: /' .. supportCommand .. ', /' .. adminCommand)
