fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'flaytex_support'
author 'FLAYTEX DEVELOPMENT'
description 'Standalone Support Ticket & Admin System'
version '1.0.0'

ui_page 'html/index.html'

shared_scripts {
    'locales/de.lua',
    'locales/en.lua',
    'locales/locale.lua',
    'config.lua'
}

client_scripts {
    'client/main.lua'
}

server_scripts {
    'server/main.lua'
}

files {
    'html/index.html',
    'html/style.css',
    'html/app.js',
    'html/img/*.svg',
    'html/fonts/*.woff2'
}
