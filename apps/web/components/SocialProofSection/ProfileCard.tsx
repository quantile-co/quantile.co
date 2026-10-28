import { Text } from "@mantine/core";
import Image from "next/image";
import classes from "./SocialProofSection.module.css";

export function ProfileCard({ inactive = false }: { inactive?: boolean }) {
  return (
    <article
      aria-hidden={inactive || undefined}
      className={`${classes.proofCard}${inactive ? ` ${classes.inactiveCard}` : ""}`}
      data-profile
    >
      <div className={classes.mediaSquare} data-company="AJ Welch">
        <Image
          alt="Portrait of AJ Welch"
          className={classes.profileImage}
          fill
          sizes="110px"
          src="/images/aj-welch.webp"
        />
      </div>

      <div className={classes.proofContent}>
        <Text className={classes.proofTitle}>AJ Welch</Text>
        <Text className={classes.profileRole}>Staff Data Engineer</Text>
        <Text className={classes.profileDescription}>
          <span>15+ years experience at</span>
          <span>Google, CompilerWorks,</span>
          <span>and Chartio.</span>
        </Text>
      </div>
    </article>
  );
}
