import { useEffect } from "react"
import { Vibrant, WorkerPipeline } from "node-vibrant/worker"
import PipelineWorker from "node-vibrant/worker.worker?worker"

// Quantizing runs in a WebWorker (bundled by Vite into its own file), the page only loads the image
// The pool adds the id/idle fields it types the worker with
type TaskWorkerClass = ConstructorParameters<typeof WorkerPipeline>[0]
// Not a React hook, Vibrant.use sets the pipeline
// eslint-disable-next-line react-hooks/rules-of-hooks
Vibrant.use(new WorkerPipeline(PipelineWorker as unknown as TaskWorkerClass))

/*
 * Cover colors as CSS variables on <html>, with the same names the mirror uses
 * (utils/SpotifyDomBuilder.js > setGlobalColors), so themes can be shared:
 *   --ONSP-VIBRANT-<SWATCH>         rgb(...) of each swatch (VIBRANT, LIGHTVIBRANT, DARKVIBRANT, MUTED, ...)
 *   --ONSP-VIBRANT-<SWATCH>-TITLE   readable title text color over that swatch
 *   --ONSP-VIBRANT-<SWATCH>-BODY    readable body text color over that swatch
 *   --ONSP-VIBRANT-DOMINANTDARK / DOMINANTBRIGHT / DOMINANTEMPHASIS  Vibrant shaded for contrast
 *   --ONSP-VIBRANT-HUE-ROTATE       hue-rotate() angle that turns the green ONSP icon into the Vibrant hue
 * Without a cover (or a swatch Vibrant could not find) the variable is removed and the
 * fallbacks in index.css (Tailwind onsp-* colors) apply.
 */

const SWATCHES = ["Vibrant", "LightVibrant", "DarkVibrant", "Muted", "LightMuted", "DarkMuted"] as const
const DOMINANT = ["DOMINANTDARK", "DOMINANTBRIGHT", "DOMINANTEMPHASIS"]
const PREFIX = "--ONSP-VIBRANT-"
// Hue of the ONSP icon (src/assets/icon.png, Vibrant swatch #07b97e)
const ICON_HUE = 160

type Palette = Awaited<ReturnType<ReturnType<typeof Vibrant.from>["getPalette"]>>

const variableNames = [
  ...SWATCHES.flatMap((s) => {
    const name = PREFIX + s.toUpperCase()
    return [name, `${name}-TITLE`, `${name}-BODY`]
  }),
  ...DOMINANT.map((d) => PREFIX + d),
  `${PREFIX}HUE-ROTATE`,
]

// Same as the mirror's RGB_Linear_Shade: p < 0 darkens, p > 0 lightens
const shade = (p: number, [r, g, b]: number[]) => {
  const mix = (c: number) => Math.round(p < 0 ? c * (1 + p) : c * (1 - p) + 255 * p)
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`
}

const rgb = ([r, g, b]: number[]) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`

function toVariables(palette: Palette) {
  const vars: Record<string, string> = {}
  for (const s of SWATCHES) {
    const swatch = palette[s]
    if (!swatch) continue
    const name = PREFIX + s.toUpperCase()
    vars[name] = rgb(swatch.rgb)
    vars[`${name}-TITLE`] = swatch.titleTextColor
    vars[`${name}-BODY`] = swatch.bodyTextColor
  }
  if (palette.Vibrant) {
    const bright = shade(0.65, palette.Vibrant.rgb)
    vars[`${PREFIX}DOMINANTDARK`] = shade(-0.68, palette.Vibrant.rgb)
    vars[`${PREFIX}DOMINANTBRIGHT`] = bright
    vars[`${PREFIX}DOMINANTEMPHASIS`] = bright
    // Shortest way around the color wheel, so the transition does not spin through every color
    const turn = (((palette.Vibrant.hsl[0] * 360 - ICON_HUE) % 360) + 540) % 360 - 180
    vars[`${PREFIX}HUE-ROTATE`] = `${Math.round(turn)}deg`
  }
  return vars
}

function apply(vars: Record<string, string>) {
  const style = document.documentElement.style
  for (const name of variableNames)
    if (vars[name]) style.setProperty(name, vars[name])
    else style.removeProperty(name)
}

// Covers repeat a lot (same album, pause/resume), keep the last few palettes
const cache = new Map<string, Record<string, string>>()

/** Sets the cover palette variables while `image` is shown, clears them when it is null. */
export function useVibrantPalette(image: string | null | undefined) {
  useEffect(() => {
    if (!image) {
      apply({})
      return
    }
    const cached = cache.get(image)
    if (cached) {
      apply(cached)
      return
    }
    // A newer cover can arrive before this one is processed
    let current = true
    Vibrant.from(image)
      .getPalette()
      .then((palette) => {
        const vars = toVariables(palette)
        cache.set(image, vars)
        if (cache.size > 20) cache.delete(cache.keys().next().value!)
        if (current) apply(vars)
      })
      .catch((e) => {
        // The cover is still shown, only the colors fall back to the defaults
        console.warn("Vibrant could not read the cover", e)
        if (current) apply({})
      })
    return () => {
      current = false
    }
  }, [image])
}
