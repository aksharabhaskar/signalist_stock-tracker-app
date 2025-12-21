'use client'

import { LogOut } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { signOut } from "@/lib/actions/auth.actions"

const UserDropdown = ({user} : {user:User}) => {
    const router = useRouter();

    const handleSignout = async () => {
        await signOut();
        router.push("/sign-in");
    };

    // Get initials from name or email
    const getInitials = () => {
        if (user.name) {
            const names = user.name.trim().split(' ');
            if (names.length >= 2) {
                return (names[0][0] + names[names.length - 1][0]).toUpperCase();
            }
            return user.name.substring(0, 2).toUpperCase();
        }
        return user.email?.substring(0, 2).toUpperCase() || 'U';
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                <Avatar>
                    <AvatarImage src="" />
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user.name || 'My Account'}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={handleSignout}
                    className="text-gray-100 text-md font-medium focus:bg-gray-700 cursor-pointer"
                >
                    <LogOut className="h-4 w-4 mr-2 hidden sm:block" />
                    Sign Out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default UserDropdown;