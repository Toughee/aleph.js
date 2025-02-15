import { useContext, useMemo } from 'https://esm.sh/react'
import util from '../../shared/util.ts'
import type { RouterURL } from '../../types.ts'
import events from '../core/events.ts'
import { RouterContext } from './context.ts'
import { AsyncUseDenoError } from './error.ts'

/**
 * `useRouter` allows you to use `RouterURL` obeject of routing
 *
 * ```tsx
 * export default function App() {
 *   const { locale, pathname, pagePath, params, query } = useRouter()
 *   return <p>{pathname}</p>
 * }
 * ```
 */
export function useRouter(): RouterURL {
  return useContext(RouterContext)
}

/**
 * `useDeno` allows you to use Deno runtime in build time(SSR).
 *
 * ```tsx
 * export default function App() {
 *   const version = useDeno(() => Deno.version.deno)
 *   return <p>{version}</p>
 * }
 * ```
 *
 * @param {Function} callback - hook callback.
 * @param {number} revalidate - revalidate duration in seconds.
 */
export function useDeno<T = any>(callback: () => (T | Promise<T>), revalidate?: number): T {
  const id = arguments[2] // generated by compiler
  const { pathname } = useRouter()
  return useMemo(() => {
    const global = globalThis as any
    const dataUrl = 'pagedata://' + pathname
    const eventName = 'useDeno-' + dataUrl
    const key = dataUrl + '#' + id
    const expires = revalidate ? Date.now() + revalidate * 1000 : 0
    const renderingDataCache = global['rendering-' + dataUrl]
    if (renderingDataCache && key in renderingDataCache) {
      return renderingDataCache[key] // 2+ pass
    } else if (util.inDeno) {
      const v = callback()
      if (v instanceof Promise) {
        events.emit(eventName, id, v.then(value => {
          if (renderingDataCache) {
            renderingDataCache[key] = value
          }
          events.emit(eventName, id, { value, expires })
        }))
        // thow an `AsyncUseDenoError` to break current rendering, then re-render
        throw new AsyncUseDenoError()
      } else {
        if (renderingDataCache) {
          renderingDataCache[key] = v
        }
        events.emit(eventName, id, { value: v, expires })
        return v
      }
    }
    if (key in global) {
      return global[key].value
    }
    return null
  }, [id, pathname])
}
