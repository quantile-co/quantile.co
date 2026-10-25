import classes from "./BrandLogo.module.css";

export function BrandLogo() {
  return (
    <span aria-label="Quantile" className={classes.root} role="img">
      <span aria-hidden="true" className={classes.image} />
    </span>
  );
}
