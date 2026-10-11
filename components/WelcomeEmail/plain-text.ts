import { toPlainText } from "react-email";

export function welcomeEmailPlainText(html: string): string {
  return toPlainText(html, {
    selectors: [
      { selector: "h1", options: { uppercase: false } },
      { selector: "li", format: "block", options: { trailingLineBreaks: 2 } },
    ],
  });
}
