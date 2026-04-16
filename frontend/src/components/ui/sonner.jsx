import { Toaster as Sonner, toast } from "sonner"

const Toaster = ({
  ...props
}) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#0F0F12] group-[.toaster]:text-[#FAFAFA] group-[.toaster]:border-[#27272A] group-[.toaster]:shadow-none",
          description: "group-[.toast]:text-[#71717A]",
          actionButton:
            "group-[.toast]:bg-[#2563EB] group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-[#18181B] group-[.toast]:text-[#A1A1AA]",
        },
      }}
      {...props} />
  );
}

export { Toaster, toast }
