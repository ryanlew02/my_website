// Applies a saved theme before first paint. Inline (it must run before CSS
// paints), so astro.config.mjs hashes this exact string into the CSP —
// change it here and the hash follows automatically.
export const THEME_INIT = "try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}";
