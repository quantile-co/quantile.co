import classes from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={classes.main} id="main-content" tabIndex={-1}>
      <div className={classes.content}>
        <p className={classes.code}>404</p>
        <h1 className={classes.title}>Page not found.</h1>
        <p className={classes.description}>We couldn’t find that page.</p>
        <a className={classes.homeLink} href="/">
          Back to home
        </a>
      </div>
    </main>
  );
}
