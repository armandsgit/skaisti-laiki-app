import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearchChange?: (value: string) => void;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onSearchChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange?.(e.target.value);
      props.onChange?.(e);
    };

    return (
      <div className="relative w-full">
        <Search 
          className="hidden sm:block absolute left-4 top-1/2 -translate-y-1/2 text-foreground/60 pointer-events-none" 
          size={20}
        />
        <input
          ref={ref}
          type="text"
          className={cn(
            "flex h-[52px] w-full rounded-[16px] border-2 border-border/50 bg-white pl-4 sm:pl-12 pr-4 py-3 text-[15px] font-medium text-foreground transition-all duration-200 placeholder:text-foreground/40 placeholder:font-normal shadow-sm hover:border-border/80 hover:shadow-md focus-visible:outline-none focus-visible:border-foreground focus-visible:shadow-lg disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          onChange={handleChange}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";

export { SearchInput };
