<br>

<div align="center">
  <h1>quantile.co</h1>
  <p>Quantile marketing site.</p>
  <p>
    <a href="#repositories">Repositories</a> ·
    <a href="#prerequisites">Prerequisites</a> ·
    <a href="#local-development">Local Development</a>
  </p>
</div>

<br>

## Repositories

- `quantile-co/quantile.co` owns the application, reusable Terraform module and
  application Firebase configuration.
- `quantile-q1/quantile.co` selects the production project and handles private
  configuration and manual deployment.

## Prerequisites

- [Node.js](https://nodejs.org) 22
- [pnpm](https://pnpm.io)
- [Java JDK](https://adoptium.net) 21 or later (for the Firebase Emulator Suite)

For optional local integration (`pnpm dev --integration`):

- [Stripe CLI](https://docs.stripe.com/stripe-cli)
- [Resend CLI](https://resend.com/docs/cli)
- [ngrok](https://ngrok.com/docs/start)

## Local Development

```sh
pnpm install
pnpm dev
```

Open <http://localhost:3000>. This also starts an isolated Firestore emulator.
Use `pnpm dev --integration` to additionally connect Stripe and Resend.

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
