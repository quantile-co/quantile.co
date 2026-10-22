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

After cloning, allow direnv to load the development environment:

```sh
direnv allow
```

## Development

### Install

```sh
pnpm install --frozen-lockfile
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
# Run the existing unit, Firestore emulator and browser tests.
pnpm test

# Run provider-backed integration tests.
pnpm run test:integration
```

### Build

```sh
pnpm run build:assets
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
