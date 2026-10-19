# FLAYTEX Support

A modern, standalone support ticket and administrative management system for FiveM. Zero framework dependencies required—works out of the box on any server (Standalone, ESX, QBCore, Qbox, vRP, etc.).

---

## ✨ Features

- **Dual-Mode Player UI (`/support`)**:
  - **No Active Ticket**: Opens the ticket creation form with customizable category selection, target player ID field (for player reports), subject, description, and optional player coordinate attachment.
  - **Active Ticket Exists**: Automatically opens the player's active ticket dashboard, showing the real server-generated ticket ID (`#1001`), status badge, assigned staff member, full chronological message history, reply input, and a "Close Ticket" button.
- **Support Admin Dashboard (`/supportadmin`)**:
  - Real-time ticket statistics counter (`Open`, `In Progress`, `Waiting`, `Closed`).
  - Interactive status tabs with live badge counters.
  - Instant search filtering (by ticket ID, player name, or subject) and newest/oldest sorting.
  - Ticket management actions: **Claim**, **Goto Player**, **Bring Player**, **Reply**, and **Close**.
- **100% Standalone**:
  - No ESX, QBCore, ox_lib, or MySQL dependencies needed.
  - Built-in standalone toast notifications (top-left).
- **Comprehensive Discord Webhook Logging**:
  - Audit logs with clean markdown & codeblock formatting.
  - Logs ticket creation, claims, staff & player replies, administrative teleports (Goto/Bring), and ticket closings.
  - Mentions the user's Discord ID (`<@ID>`) and includes FiveM License, coordinates, and exact timestamps.
  - *Strictly audit-only: No external Discord bot or token required.*
- **Dual-Language Locales (`de` & `en`)**:
  - Fully translated into English (`en`) and German (`de`) via `locales/en.lua` and `locales/de.lua`.
  - Switch languages with a single config variable (`Config.Locale = 'en'`).
- **Fully Customizable Theme & Categories**:
  - Customize accent colors, hover states, and status colors (`Open`, `In Progress`, `Waiting`, `Closed`) via `config.lua`.
  - Add, edit, or remove categories dynamically with custom SVG icons and target player requirements.
- **Strict Server-Side Validation**:
  - Anti-spam cooldown timer between ticket submissions.
  - Character length constraints for subjects, descriptions, and replies.
  - Player coordinates are queried directly from server-side entities (`GetEntityCoords`), preventing spoofing.

---

## 📦 Installation

1. Download or clone this repository into your FiveM server's `resources` directory:
   ```text
   resources/
   └── [scripts]/
       └── flaytex_support/
           ├── client/
           ├── html/
           ├── locales/
           ├── server/
           ├── config.lua
           └── fxmanifest.lua
   ```

2. Add the resource to your `server.cfg`:
   ```cfg
   ensure flaytex_support
   ```

3. Configure Staff Permissions in `server.cfg` (recommended):
   ```cfg
   # Grant staff permission to open the /supportadmin dashboard
   add_ace group.admin flaytex.supportadmin allow

   # Example: Assign a principal to group.admin
   add_principal identifier.license:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx group.admin
   ```
   *(Alternatively, you can list staff identifiers directly in `Config.Admin.Identifiers` inside `config.lua`)*.

4. Add your Discord Webhook in `config.lua`:
   ```lua
   Config.DiscordLogs.Webhook = 'https://discord.com/api/webhooks/YOUR_WEBHOOK_URL_HERE'
   ```

5. Restart your server or run `ensure flaytex_support` in your server console.

---

## ⚙️ Configuration (`config.lua`)

The configuration file is organized into clear sections:

### 1. Language & Locales
```lua
-- Available languages: 'en' (English), 'de' (German)
Config.Locale = 'en'
```

### 2. Commands & Keybindings
```lua
Config.SupportCommand = 'support'       -- Player ticket command
Config.SupportDefaultKey = ''          -- Optional default key (e.g. 'F11', or '' to disable)

Config.AdminCommand = 'supportadmin'    -- Admin dashboard command
Config.AdminDefaultKey = ''            -- Optional default key (e.g. 'F10', or '' to disable)
```

### 3. Admin Permissions
```lua
Config.Admin = {
    UseAce = true,
    AcePermission = 'flaytex.supportadmin', -- FiveM ACE permission node

    -- Direct identifier fallback (works without framework or ACE)
    Identifiers = {
        -- 'license:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        -- 'discord:123456789012345678',
    }
}
```

### 4. Theme & Color Customization
You can customize the accent colors to match your server branding:
```lua
Config.Theme = {
    AccentColor    = '#fc7f03', -- Main accent color (Buttons, active states, badges)
    AccentHover    = '#ff8f22', -- Hover state
    OnAccent       = '#1a0f04', -- Text color on primary buttons

    -- Status badge colors
    StatusOpen     = '#fc7f03', -- Open
    StatusProgress = '#e8b04a', -- In Progress
    StatusWaiting  = '#8fa6c8', -- Waiting for player response
    StatusClosed   = '#6fbf8e', -- Closed
}
```

### 5. Ticket Categories
Add or customize ticket categories. Setting `requireTarget = true` automatically shows the "Player ID" input field in the creation modal:
```lua
Config.Categories = {
    { id = 'question', label = 'Question', icon = 'question', requireTarget = false },
    { id = 'bug',      label = 'Bug',      icon = 'bug',      requireTarget = false },
    { id = 'player',   label = 'Report Player', icon = 'player', requireTarget = true },
    { id = 'refund',   label = 'Refund',   icon = 'refund',   requireTarget = false },
    { id = 'other',    label = 'Other',    icon = 'other',    requireTarget = false }
}
```

### 6. Ticket Validation & Anti-Spam
```lua
Config.Ticket = {
    CooldownSeconds   = 30,    -- Cooldown in seconds between ticket submissions
    MinSubjectLength  = 3,     -- Minimum character length for subject
    MaxSubjectLength  = 60,    -- Maximum character length for subject
    MinMessageLength  = 5,     -- Minimum character length for description
    MaxMessageLength  = 500,   -- Maximum character length for description
    StartTicketId     = 1000   -- Server ticket ID starting point (e.g. #1001)
}
```

### 7. Discord Webhook Logs
```lua
Config.DiscordLogs = {
    Enabled   = true,
    Webhook   = 'YOUR_DISCORD_WEBHOOK_URL',
    BotName   = 'FLAYTEX Support Logs',
    BotAvatar = 'https://i.imgur.com/4M34hi2.png',

    Events = {
        TicketCreated = true,    -- New ticket submitted in-game
        TicketClaimed = true,    -- Ticket claimed by staff member
        TicketReply   = true,    -- Message sent in ticket thread
        TicketClosed  = true,    -- Ticket closed
        AdminTeleport = true,    -- Admin teleported to player or brought player
    }
}
```

---

## 🎮 In-Game Commands

| Command | Permission | Description |
| :--- | :--- | :--- |
| `/support` | Everyone | Opens ticket creation dialog or displays player's active ticket. |
| `/supportadmin` | Staff (`flaytex.supportadmin`) | Opens the Support Admin Dashboard. |
| `/supporttestwebhook` | Staff / Console | Sends an immediate test embed to your configured Discord webhook. |

---

## 💡 Tips & Customization

### Changing the Logo
> [!TIP]
> You can easily customize the logo to match your server branding:
> 1. Go to the `html/img/` folder:
>    ```text
>    flaytex_support/html/img/logo.svg
>    ```
> 2. Replace the existing `logo.svg` file with your own server's SVG logo (or replace the file and keep the name `logo.svg`).
> 3. If you want to use a PNG or JPG instead, edit the `<img src="img/logo.svg">` tags in `html/index.html`.

### Browser Preview (No FiveM Server Needed)
You can test and preview the entire user interface directly in Google Chrome, Microsoft Edge, or Firefox:
1. Double-click or open `html/index.html` in your web browser.
2. An interactive dev-toolbar will appear at the top:
   - `/support (Neu)`: Preview ticket creation form.
   - `/support (Aktives Ticket)`: Preview player active ticket with reply thread.
   - `/supportadmin`: Preview the full staff dashboard with mock tickets.
   - `🔔 Notify`: Preview standalone toast notifications.

---

## 📜 License

Created by **FLAYTEX DEVELOPMENT**. Free to use and customize on your FiveM server.

!!! Feel free to join our Discord !!!
- https://discord.gg/vzcQVvSuNz