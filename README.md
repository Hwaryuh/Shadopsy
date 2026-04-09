# Shadopsy

**Shader/resource autopsy for JAR internals**

A static web tool that extracts shader files from Minecraft JAR files and visually compares diffs between versions in the browser.

## Features

- Extracts `.fsh`, `.vsh`, `.glsl`, and `.json` files from JAR internals
- Detects added, removed, renamed, and edited files between versions
- Split-view diff with syntax highlighting
- File tree navigation and search

## Usage

### 1. Add JAR files

Place the Minecraft JAR files you want to compare into the `jars/` directory.

```
jars/
  1.20.jar
  1.21.jar
```

### 2. Build

```bash
npm install
npm run build
```

### 3. Run

Serve the build output (`dist/`) with any static file server, or deploy via GitHub Pages.

## Development

```bash
npm run dev
```

## Live Demo

Try it out here: [murinn.cloud/Shadopsy](https://murinn.cloud/Shadopsy/)

## License

ISC
