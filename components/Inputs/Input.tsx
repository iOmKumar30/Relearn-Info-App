"use client";

import clsx from "clsx";
import {
  FieldErrors,
  FieldValues,
  RegisterOptions,
  UseFormRegister,
} from "react-hook-form";

interface InputProps {
  label: string;
  id: string;
  type?: string;
  required?: boolean;
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors;
  disabled?: boolean;
  validation?: RegisterOptions;
}

function Input({
  label,
  id,
  type,
  required,
  register,
  errors,
  disabled,
  validation,
}: InputProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="
          block 
          text-base 
          font-medium 
          text-gray-700
        "
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={id}
        disabled={disabled}
        {...register(id, { required, ...validation })}
        className={clsx(
          `
          rounded-md 
          border-2
          border-gray-300
          bg-white 
          px-3 
          py-2
          w-full
          placeholder:text-gray-400 
          text-gray-700
          transition 
          focus:border-sky-500 
          focus:outline-none 
          focus:ring-2 
          focus:ring-sky-500 
          focus:ring-offset-2 
          focus:ring-offset-white 
          sm:text-sm 
          sm:leading-6`,
          errors[id] && "border-rose-500 focus:border-rose-500",
          disabled && "opacity-50 cursor-default"
        )}
      />
    </div>
  );
}

export default Input;
