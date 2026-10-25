import { render } from "react-email";
import { welcomeEmailPlainText } from "@/components/WelcomeEmail/plain-text";
import { WelcomeEmail } from "@/components/WelcomeEmail/WelcomeEmail";
import { billingPortalLoginUrl } from "@/lib/stripe/portal";

const portraitUrl = "https://quantile.co/images/aj-welch-email.png";

export async function renderWelcomeEmail(quantity: number) {
  const html = await render(
    <WelcomeEmail
      billingPortalLoginUrl={billingPortalLoginUrl}
      portraitUrl={portraitUrl}
      quantity={quantity}
    />,
  );
  return {
    subject: "Thank you for subscribing!",
    html,
    text: welcomeEmailPlainText(html),
  };
}
