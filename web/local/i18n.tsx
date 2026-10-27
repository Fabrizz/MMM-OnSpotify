import { createContext, Fragment, useContext, useEffect, useState, type ReactNode } from "react"
// English is built in, so the page has text right away and missing keys fall back to it
import english from "../../translations/en.json"

/*
 * Same translation files as the mirror (translations/<language>.json, keys starting with PAGE_).
 * MM2 serves the module folder at /modules/MMM-OnSpotify/, so other languages are loaded at runtime
 * and can be edited without rebuilding the page. Placeholders use MM2's {name} format.
 */

type Dictionary = Record<string, string>
type Vars = Record<string, string | number>
type RichVars = Record<string, ReactNode>

const TRANSLATIONS_PATH = "../modules/MMM-OnSpotify/translations/"
// "es", "pt-br"... anything else is not a translation file name
const LANGUAGE_PATTERN = /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/i

async function loadDictionary(language: string): Promise<Dictionary | null> {
  if (!LANGUAGE_PATTERN.test(language)) return null
  try {
    const res = await fetch(`${TRANSLATIONS_PATH}${language.toLowerCase()}.json`)
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

function fill(template: string, vars: Vars = {}) {
  return template.replace(/\{([^}]+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match))
}

function makeTranslator(dictionary: Dictionary, language: string) {
  const text = (key: string) => dictionary[key] ?? (english as Dictionary)[key] ?? key
  return {
    language,
    /** Translated text, with {name} placeholders filled from vars. */
    t: (key: string, vars?: Vars) => fill(text(key), vars),
    /** Translated text where placeholders can be elements (links, <code>). */
    rich: (key: string, vars: RichVars) =>
      text(key)
        .split(/(\{[^}]+\})/)
        .map((part, i) => {
          const name = /^\{([^}]+)\}$/.exec(part)?.[1]
          return <Fragment key={i}>{name && name in vars ? vars[name] : part}</Fragment>
        }),
  }
}

type Translator = ReturnType<typeof makeTranslator>

const I18nContext = createContext<Translator>(makeTranslator({}, "en"))

export const useT = () => useContext(I18nContext)

/** Loads the mirror's language (e.g. "es", or "es" for "es-ar" without its own file). */
export function I18nProvider({ language, children }: { language?: string; children: ReactNode }) {
  const [translator, setTranslator] = useState(() => makeTranslator({}, "en"))

  useEffect(() => {
    if (!language || language.toLowerCase() === "en") {
      setTranslator(makeTranslator({}, "en"))
      return
    }
    let cancelled = false
    ;(async () => {
      const base = language.split("-")[0]
      const dictionary = (await loadDictionary(language)) ?? (base !== language ? await loadDictionary(base) : null)
      if (!cancelled) setTranslator(makeTranslator(dictionary ?? {}, dictionary ? language : "en"))
    })()
    return () => {
      cancelled = true
    }
  }, [language])

  useEffect(() => {
    document.documentElement.lang = translator.language
  }, [translator.language])

  return <I18nContext.Provider value={translator}>{children}</I18nContext.Provider>
}
