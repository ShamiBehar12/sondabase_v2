import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#171C25] group-[.toaster]:text-[#F3F7FC] group-[.toaster]:border-[#3E4A5F] group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-white",
          actionButton:
            "group-[.toast]:bg-[#3B82F6] group-[.toast]:text-[#F8FBFF]",
          cancelButton:
            "group-[.toast]:bg-[#232C3A] group-[.toast]:text-white",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }


