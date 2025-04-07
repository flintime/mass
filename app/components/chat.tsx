import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatButtonProps {
  businessId: string;
  variant?: "default" | "outline" | "secondary";
  className?: string;
}

export function ChatButton({ businessId, variant = "default", className }: ChatButtonProps) {
  return (
    <Button 
      variant={variant}
      className={cn(
        "w-full transition-all duration-200",
        className
      )}
      onClick={() => {
        // Handle chat initiation
        console.log('Starting chat with business:', businessId);
      }}
    >
      <span className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        <span>Flint to Book</span>
      </span>
    </Button>
  );
} 