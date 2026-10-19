-- ========================================================
-- FLAYTEX Support - Locale Helper System
-- ========================================================

Locales = Locales or {}

function _U(str, ...)
    local lang = (Config and Config.Locale) or 'de'
    local dict = Locales[lang] or Locales['de'] or Locales['en']
    if dict and dict[str] then
        if select('#', ...) > 0 then
            return string.format(dict[str], ...)
        end
        return dict[str]
    end

    -- Fallbacks
    if Locales['de'] and Locales['de'][str] then
        if select('#', ...) > 0 then
            return string.format(Locales['de'][str], ...)
        end
        return Locales['de'][str]
    end
    if Locales['en'] and Locales['en'][str] then
        if select('#', ...) > 0 then
            return string.format(Locales['en'][str], ...)
        end
        return Locales['en'][str]
    end

    return str
end

function GetCurrentLocale()
    return (Config and Config.Locale) or 'de'
end

function GetLocaleTable(lang)
    lang = lang or GetCurrentLocale()
    return Locales[lang] or Locales['de'] or Locales['en'] or {}
end
