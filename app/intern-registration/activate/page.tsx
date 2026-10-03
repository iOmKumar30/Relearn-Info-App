import InternPaymentActivation from "./InternPaymentActivation";
import { headers } from "next/headers";

export default async function InternPaymentActivationPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <InternPaymentActivation nonce={nonce} />;
}
