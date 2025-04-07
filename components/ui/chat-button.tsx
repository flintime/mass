import { Button } from "./button";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatButtonProps {
  businessId: string;
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export function ChatButton({ businessId, variant = "default", className }: ChatButtonProps) {
  const handleClick = () => {
    console.log(`Opening chat for business: ${businessId}`);
    // Add your chat opening logic here
  };

  return (
    <Button
      variant={variant}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2",
        className
      )}
    >
      <MessageSquare className="h-4 w-4" />
      <span>Chat Now</span>
    </Button>
  );
} 