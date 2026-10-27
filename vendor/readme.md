## `vibrant.worker.min.js`
Library: https://github.com/Vibrant-Colors/node-vibrant

> Custom build using the pull [#139 from @baoshan](https://github.com/Vibrant-Colors/node-vibrant/pull/139).
Fixes Webworker thread usage so the color proccessing does not affect painting.

> If you want to build it yourself or use other version and you are using a newer node.js version (<17.0) set `$env:NODE_OPTIONS="--openssl-legacy-provider"` to use the legacy OSSL

### Why not the npm package?
`node-vibrant` is maintained again (v4 on npm), but it cannot be loaded the way MagicMirror² loads module scripts:

- MM2 (`getScripts`) injects each `.js` file as a classic `<script>` tag, so the library has to be a single self-contained file that sets a global (`window.Vibrant`).
- v4 only ships ESM/CJS builds (`dist/esm`, `dist/cjs`), with no UMD/browser bundle. Its files import other packages by bare name (`@vibrant/core`, `@vibrant/worker`, ...), which a browser cannot resolve without a bundler or an import map, and MM2 offers neither (even loaded as `.mjs`).
- The WebWorker mode needs a second script (`node-vibrant/worker.worker`) that the worker loads by URL. It has the same bare imports, so it also needs bundling.

Using v4 would mean adding a bundler (e.g. esbuild) and a build step on install, which ends up as another generated file anyway. So the prebuilt file stays here until upstream publishes a browser bundle.
