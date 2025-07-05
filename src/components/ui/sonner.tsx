"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  const { theme = "dark" } = useTheme();

  return (
    <Sonner
      theme={"dark"}
      className="toaster group"
      richColors={true}
      closeButton={false}
      position="top-left"
      {...props}
    />
  );
};

export { Toaster };
