# VidPilot Renderer

Remotion package for project export renders. The renderer consumes a
`RenderDocument` JSON file and writes an MP4. It does not read the database.

## Commands

**Install Dependencies**

```console
npm i
```

**Start Preview**

```console
npm run dev
```

**Render a document**

```console
npm run render:document -- --input /tmp/render-document.json --output /tmp/export.mp4
```
