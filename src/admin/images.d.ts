/**
 * Image imports for the admin app.
 *
 * `src/admin/app.tsx` imports the ROG mark and favicon directly. Vite — which
 * builds the admin — resolves those to URLs at build time, but TypeScript has
 * no built-in knowledge of what a `.png` module is, so without this file an
 * editor (and `tsc`) flags both imports as errors even though the build is
 * fine. Declaring them here is the standard fix.
 */
declare module '*.png' {
  const src: string
  export default src
}

declare module '*.svg' {
  const src: string
  export default src
}
