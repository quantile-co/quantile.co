import { Text } from "@mantine/core";
import { IconBrandLinkedin, IconSquareLetterX } from "@tabler/icons-react";
import Image from "next/image";
import classes from "./SocialProofSection.module.css";

function SocialLinks({ inactive }: { inactive: boolean }) {
  return (
    <span className={classes.socialLinks}>
      <a
        aria-label="AJ Welch on LinkedIn"
        className={classes.socialLink}
        href="https://www.linkedin.com/in/ajwelch4/"
        rel="noopener noreferrer"
        tabIndex={inactive ? -1 : undefined}
        target="_blank"
      >
        <IconBrandLinkedin aria-hidden="true" size={16} stroke={1.7} />
      </a>
      <a
        aria-label="AJ Welch on X"
        className={classes.socialLink}
        href="https://x.com/AJWelch"
        rel="noopener noreferrer"
        tabIndex={inactive ? -1 : undefined}
        target="_blank"
      >
        <IconSquareLetterX aria-hidden="true" size={16} stroke={1.7} />
      </a>
    </span>
  );
}

export function ProfileCard({
  compact = false,
  inactive = false,
}: {
  compact?: boolean;
  inactive?: boolean;
}) {
  return (
    <article
      aria-hidden={inactive || undefined}
      aria-label={compact ? "AJ Welch" : undefined}
      className={`${classes.proofCard}${inactive ? ` ${classes.inactiveCard}` : ""}`}
      data-compact={compact || undefined}
      data-profile
    >
      <div className={classes.mediaSquare} data-company="AJ Welch">
        <Image
          alt="Portrait of AJ Welch"
          className={classes.profileImage}
          fill
          sizes={
            compact
              ? "72px"
              : "(max-width: 767px) 88px, (max-width: 1024px) 68px, 80px"
          }
          src="/images/aj-welch.webp"
        />
      </div>

      {!compact && (
        <div className={`${classes.proofContent} ${classes.profileContent}`}>
          <Text className={classes.proofTitle}>AJ Welch</Text>
          <Text className={classes.profileRole}>Staff Data Engineer</Text>
          <Text className={classes.profileDescription}>
            15+ years experience at
            <br />
            Google, CompilerWorks,
            <br />
            <span className={classes.profileLastLine}>
              <span>and Chartio.</span>
              <SocialLinks inactive={inactive} />
            </span>
          </Text>
        </div>
      )}
    </article>
  );
}
