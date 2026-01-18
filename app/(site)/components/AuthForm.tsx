"use client";

import axios from "axios";
import { signIn, useSession } from "next-auth/react";
import { BsGoogle } from "react-icons/bs";

import Button from "@/components/Button";
import Input from "@/components/Inputs/Input";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import toast, { Toaster } from "react-hot-toast";
import AuthSocialButton from "./AuthSocialButton";

type Variant = "LOGIN" | "REGISTER";

export function AuthForm() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // redirect to the right page based on session role
  useEffect(() => {
    if (status === "authenticated" && session?.user?.roles) {
      const roles = session.user.roles;

      if (roles.includes("PENDING")) {
        router.push("/pending");
      } else {
        router.push("/dashboard");
      }
    }
  }, [status, session, router]);
  const [variant, setVariant] = useState<Variant>("LOGIN");
  const [isLoading, setIsLoading] = useState(false);

  const toggleVariant = useCallback(() => {
    if (variant === "LOGIN") {
      setVariant("REGISTER");
    } else {
      setVariant("LOGIN");
    }
  }, [variant]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    setIsLoading(true);

    if (variant === "REGISTER") {
      const loadingToast = toast.loading("Registering...");
      axios
        .post("/api/register", data)
        .then(() => {
          toast.success("Registration successful!", { id: loadingToast });
          signIn("credentials", data);
        })
        .catch((error) => {
          toast.error("Something went wrong during registration.", {
            id: loadingToast,
          });
        })
        .finally(() => setIsLoading(false));
    }

    if (variant === "LOGIN") {
      const loadingToast = toast.loading("Signing in...");
      signIn("credentials", {
        ...data,
        redirect: false,
      })
        .then((callback) => {
          if (callback?.error) {
            toast.error("Invalid credentials", { id: loadingToast });
          }
          if (callback?.ok && !callback.error) {
            toast.success("Logged in successfully!", { id: loadingToast });
            router.push("/dashboard");
          }
        })
        .finally(() => setIsLoading(false));
    }
  };

  const socialAction = (action: string) => {
    setIsLoading(true);
    const loadingToast = toast.loading("Redirecting to social login...");

    signIn(action, { redirect: false })
      .then((callback) => {
        if (callback?.error) {
          toast.error("Social login failed", { id: loadingToast });
        }
        if (callback?.ok && !callback.error) {
          toast.success("Logged in successfully!", { id: loadingToast });
        }
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">


      <div
        className="
          bg-white
          px-4
          py-8
          shadow
          sm:rounded-lg
          sm:px-10
        "
      >
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <Input
            disabled={isLoading}
            register={register}
            errors={errors}
            required
            id="email"
            label="Email address"
            type="email"
            validation={{
              required: "Email is required",
              pattern: {
                value: /\S+@\S+\.\S+/,
                message: "Invalid email address",
              },
            }}
          />
          <Input
            disabled={isLoading}
            register={register}
            errors={errors}
            required
            id="password"
            label="Password"
            type="password"
          />
          <div>
            <Button disabled={isLoading} fullWidth type="submit">
              {variant === "LOGIN" ? "Sign in" : "Register"}
            </Button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div
              className="
                absolute 
                inset-0 
                flex 
                items-center
              "
            >
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <AuthSocialButton
              icon={BsGoogle}
              onClick={() => socialAction("google")}
            />
          </div>
        </div>
        <div
          className="
            flex 
            gap-2 
            justify-center 
            text-sm 
            mt-6 
            px-2 
            text-gray-500
          "
        >
          <div className="text-gray-500">
            {variant === "LOGIN"
              ? "Don't have an account?"
              : "Already have an account?"}
          </div>
          <div
            className="text-gray-500 underline cursor-pointer"
            onClick={toggleVariant}
          >
            {variant === "LOGIN" ? "Create an account" : "Login"}
          </div>
        </div>
      </div>
    </div>
  );
}
