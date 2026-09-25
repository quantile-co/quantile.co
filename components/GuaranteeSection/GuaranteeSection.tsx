import { Text } from "@mantine/core";
import {
  IconCalendarCheck,
  IconCode,
  IconPlayerPause,
  IconShieldCheck,
} from "@tabler/icons-react";
import classes from "./GuaranteeSection.module.css";

const guarantees = [
  {
    icon: IconShieldCheck,
    title: "Guaranteed code quality",
    description:
      "No AI slop. No outsourcing. Unlimited revisions until PR approval.",
  },
  {
    icon: IconCalendarCheck,
    title: "Try it for a week",
    description:
      "Not loving it after a week? Get 75% back, no questions asked.",
  },
  {
    icon: IconPlayerPause,
    title: "Pause or cancel anytime",
    description: "No long-term contracts, commitments, or fees.",
  },
  {
    icon: IconCode,
    title: "You own the work",
    description: "The code remains yours, even after you pause or cancel.",
  },
] as const;

export function GuaranteeSection() {
  return (
    <ul className={classes.grid}>
      {guarantees.map(({ description, icon: Icon, title }) => (
        <li key={title}>
          <Icon aria-hidden="true" className={classes.icon} stroke={1.75} />
          <Text className={classes.title}>{title}</Text>
          <Text className={classes.description}>{description}</Text>
        </li>
      ))}
    </ul>
  );
}
