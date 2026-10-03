import InternRegistrationForm from "./InternRegistrationForm";
import { headers } from "next/headers";

export default async function InternRegistrationPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <InternRegistrationForm nonce={nonce} />;
}
