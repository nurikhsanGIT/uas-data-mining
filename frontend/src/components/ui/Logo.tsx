// src/components/ui/Logo.tsx

import { Snowflake } from "lucide-react";
import { cn } from "../../lib/cn";

interface LogoProps {
  size?: "sm" | "lg";
}

export function Logo({
  size = "sm",
}: LogoProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5",
        size === "lg" && "gap-3"
      )}
    >
      <div
        className={cn(
          "rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white shadow-md shadow-blue-300/40",
          size === "sm"
            ? "w-9 h-9"
            : "w-16 h-16"
        )}
      >
        <Snowflake
          className={
            size === "sm"
              ? "w-5 h-5"
              : "w-9 h-9"
          }
        />
      </div>

      <div>
        <div
          className={cn(
            "font-bold text-gray-900 leading-tight tracking-tight",
            size === "sm"
              ? "text-base"
              : "text-2xl"
          )}
        >
          Nikky Superstore
        </div>

        {size === "lg" && (
          <div className="text-sm text-blue-400 font-medium">
            Point of Sale System
          </div>
        )}
      </div>
    </div>
  );
}
