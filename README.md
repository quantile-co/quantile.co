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
devenv tasks run --show-output install:git:hooks
devenv tasks run --show-output install:dependencies
```

### Application

```sh
devenv tasks run --show-output dev:app
```

Open <http://localhost:3000>.

### Components

```sh
devenv tasks run --show-output dev:storybook
```

Open <http://localhost:6006>.

### Checks

```sh
# Check source without running tests or builds, or accessing production state.
devenv tasks run --show-output check:all

# Apply source fixes explicitly.
devenv tasks run --show-output fix:all
```

### Tests

```sh
# Run the existing unit, Firestore emulator and browser tests.
devenv tasks run --show-output test:all

# Run provider-backed integration tests.
devenv tasks run --show-output test:integration
```

### Build

```sh
devenv tasks run --show-output build:assets
# Build the application and Storybook without running tests or publishing.
devenv tasks run --show-output build:all
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
