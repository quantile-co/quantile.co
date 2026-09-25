<br>

<div align="center">
  <h1>quantile.co</h1>
  <p>Quantile marketing site.</p>
  <p>
    <a href="#prerequisites">Prerequisites</a> ·
    <a href="#local-development">Local Development</a>
  </p>
</div>

<br>

## Prerequisites

- [Node.js](https://nodejs.org) 22
- [pnpm](https://pnpm.io)

## Local Development

```sh
pnpm install
pnpm dev
```

Open <http://localhost:3000>.

### Components

```sh
pnpm storybook
```

Open <http://localhost:6006>.

### Assets

```sh
pnpm assets:generate
```

### Checks

Install Chromium and its system dependencies once, then run the complete checks:

```sh
pnpm exec playwright install --with-deps chromium
pnpm check
```
