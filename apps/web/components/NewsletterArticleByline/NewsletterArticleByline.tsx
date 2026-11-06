import Image from "next/image";
import classes from "./NewsletterArticleByline.module.css";

export function NewsletterArticleByline({
  contributor,
  date,
}: {
  contributor: { name: string; image: string };
  date?: string;
}) {
  return (
    <div className={classes.byline}>
      <Image
        className={classes.portrait}
        src={contributor.image}
        alt=""
        width={24}
        height={24}
      />
      <div className={classes.details}>
        <span className={classes.contributor}>{contributor.name}</span>
        {date && (
          <>
            <span aria-hidden="true">·</span>
            <time dateTime={date}>
              {new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date(date))}
            </time>
          </>
        )}
      </div>
    </div>
  );
}
