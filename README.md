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

```sh
devenv tasks run --show-output dev:app
```

Open <http://localhost:3000>. Development, Check, Test, Fix and Build tasks run
`install:dependencies` first, using the frozen lockfile without lifecycle scripts.

### Components

```sh
devenv tasks run --show-output dev:storybook
```

Open <http://localhost:6006>.

### Assets

```sh
pnpm assets:generate
```

### Checks

```sh
# Check source without running tests or builds, or accessing production state.
devenv tasks run --show-output check:all

# Apply source fixes explicitly.
devenv tasks run --show-output fix:all

# Run the existing unit, Firestore emulator and browser tests.
devenv tasks run --show-output test:all

# Build the application and Storybook without running tests or publishing.
devenv tasks run --show-output build:all
```

Provider-backed `pnpm test:integration` is separate and requires its own setup
and approval. The manual Build workflow publishes a reviewed immutable source
release; it does not run tests or deploy the site.

## Skills

Run from this repository with Pi. These Factory skills manage this repository's
settings and state infrastructure, not application publication.

- **Day Zero deployment** — new installations only:

  ```sh
  pi "/skill:day-zero-deploy"
  ```

- **Steady-state deployment** — existing infrastructure:

  ```sh
  pi "/skill:deploy"
  ```

Build, Plan and Apply each require separate approval. A passing Check or Test
is not deployment authorization.
