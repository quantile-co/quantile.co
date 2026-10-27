<!-- markdownlint-disable MD041 -->
<br>

<div align="center">
  <h1>quantile.co</h1>
  <p>Quantile marketing site.</p>
  <p>
    <a href="#prerequisites">Prerequisites</a> ·
    <a href="#development">Development</a> ·
    <a href="#skills">Skills</a>
  </p>
</div>

<br>
<!-- markdownlint-enable MD041 -->

## Prerequisites

- [Nix](https://nix.dev/install-nix.html)
- [direnv](https://direnv.net/docs/installation.html)
- For webhook integration, connect [Tailscale](https://tailscale.com/download)
  to a tailnet with MagicDNS, HTTPS, and Funnel enabled. Once per laptop, check
  `tailscale serve status` for other listeners on port 8443. If none use it, run:

  ```sh
  tailscale funnel --bg --https=8443 --set-path=/api/resend/webhook/ http://127.0.0.1:4318
  ```

  Reserve local port 4318 for this listener. Leave other Serve/Funnel settings alone.

After cloning, allow direnv to load the development environment:

```sh
direnv allow
```

## Development

### Install

```sh
pnpm install --frozen-lockfile
pnpm run skills:sync
```

### App

```sh
pnpm dev
```

Open <http://localhost:3000>.

### Components

```sh
pnpm run dev:storybook
```

Open <http://localhost:6006>.

### Checks

```sh
pnpm run check
pnpm run fix
```

### Tests

```sh
pnpm test # Run local tests.
pnpm run test:integration # Concurrent integration runs on a single machine not yet supported, including worktrees.
```

### Build

```sh
pnpm run build:assets # Generate brand assets.
pnpm run build
pnpm run build:storybook
```

## Skills

Run from this repository with Pi.

- **Day Zero deployment**:

  ```sh
  pi "/skill:day-zero-deploy"
  ```

- **Steady-state deployment**:

  ```sh
  pi "/skill:deploy"
  ```
