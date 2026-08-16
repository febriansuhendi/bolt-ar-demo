# WebAR Product Demo

A minimal, mobile-first WebAR product demonstration built with React, Vite, Three.js, and MindAR image tracking.

## 1. Requirements

- Node.js 18+
- A modern mobile browser (Safari iOS 14+, Chrome Android)
- Device camera
- HTTPS (required for camera access — see section 10)

## 2. Install

```bash
npm install
```

## 3. Run in development

```bash
npm run dev
```

Open the printed local URL on your device. For camera access on a phone, serve over HTTPS (e.g. via a tunnel like `ngrok` or Vite's `--host` over LAN + a trusted cert).

## 4. Create the image target (`target.mind`)

Use the official MindAR image target compiler:

https://hiukim.github.io/mind-ar-js-doc/tools/compile/

Upload a single high-contrast, feature-rich image of your product (avoid flat/symmetric images). Download the generated `.mind` file. Do not generate this file programmatically.

## 5. Place `target.mind`

Put the file here so it is served at `/targets/target.mind`:

```
public/targets/target.mind
```

If this file is missing the app shows an error state instead of starting the camera.

## 6. Place `product.glb` (optional)

Put your 3D model here so it is served at `/models/product.glb`:

```
public/models/product.glb
```

If `product.glb` is missing or fails to load, the app falls back to a simple colored cube so the experience still runs.

## 7. Change the Buy Now URL

Edit the constant at the top of `src/ar/WebAR.jsx`:

```js
const PRODUCT_URL = "https://example.com/product";
```

The floating Buy Now button appears only while the image target is detected and opens this URL in a new tab.

## 8. Build

```bash
npm run build
```

Outputs a static site to `dist/`.

## 9. Deployment

The build is fully static — no backend required. Deploy the `dist/` folder to any static host:

- **Vercel**: Framework preset "Vite", output `dist`.
- **Netlify**: Build command `npm run build`, publish directory `dist`.
- **GitHub Pages**: Push the contents of `dist/` to your `gh-pages` branch or use a deploy action.

Remember to also upload `public/targets/target.mind` and (optionally) `public/models/product.glb`; they are copied into `dist/` automatically by Vite.

## 10. Camera / HTTPS requirement

Browsers only grant camera access on **HTTPS** (or `http://localhost` for local dev). Static hosts like Vercel, Netlify, and GitHub Pages serve HTTPS by default, so production camera access will work. For local testing on a physical device, use a HTTPS tunnel (e.g. `ngrok http <port>`) rather than plain LAN IP.
