import ClientOnly from "@/components/ClientOnly";
import { AuthForm } from "./components/AuthForm";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-black">
          Sign in/Sign up to your account
        </h2>
      </div>
      <ClientOnly>
        <AuthForm />
      </ClientOnly>
    </div>
  );
}
