import { render, toPlainText } from "react-email";
import { WelcomeEmail } from "../../../../../../../../components/WelcomeEmail/WelcomeEmail";

export async function renderWelcomeEmail(quantity: number) {
  const html = await render(<WelcomeEmail quantity={quantity} />);
  return {
    subject: "Welcome to Quantile",
    html,
    text: toPlainText(html),
  };
}
