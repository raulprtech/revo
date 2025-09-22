"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { LogOut, User, Wrench, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type User = {
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
};

export function UserNav({ user }: { user: User }) {
  const router = useRouter();
  const supabase = createClient();

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    const names = name.split(" ");
    return names.length > 1
      ? `${names[0][0]}${names[names.length - 1][0]}`
      : names[0][0];
  };

  const handleLogout = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();

      // Clear localStorage
      localStorage.removeItem("user");

      // Trigger storage event for header to update
      window.dispatchEvent(new Event("storage"));

      // Redirect to home page
      router.push('/');
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if Supabase signout fails, clear local storage
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("storage"));
      router.push('/');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.photoURL ?? ""} alt={user.displayName ?? ""} />
            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Panel</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/tournaments/create">
              <Wrench className="mr-2 h-4 w-4" />
              <span>Crear Torneo</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
