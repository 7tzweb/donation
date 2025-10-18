import createCache from "@emotion/cache"
import rtlPlugin from "stylis-plugin-rtl"

export default function createEmotionCache(key = "mui-rtl") {
  return createCache({
    key,
    stylisPlugins: [rtlPlugin],
    prepend: true,
  })
}
