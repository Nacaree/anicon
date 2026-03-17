"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthGate } from "@/context/AuthGateContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function AuthGateModal() {
  const { isOpen, closeGate } = useAuthGate();
  const router = useRouter();

  const handleLogin = () => {
    closeGate();
    router.push("/login");
  };

  const handleSignUp = () => {
    closeGate();
    router.push("/signup");
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeGate}>
      <DialogContent className="sm:max-w-sm text-center">
        <DialogHeader className="items-center">
          <Image
            src="/logo.svg"
            alt="AniCon Logo"
            width={80}
            height={40}
            className="mb-2"
          />
          <DialogTitle className="text-xl">Join AniCon</DialogTitle>
          <DialogDescription>
            Log in or create an account to post, like, and connect with the
            community.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-2">
          <button
            onClick={handleLogin}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-full font-medium transition-colors"
          >
            Log in
          </button>
          <button
            onClick={handleSignUp}
            className="w-full border-2 border-[#FF7927] text-[#FF7927] hover:bg-orange-50 py-2.5 rounded-full font-medium transition-colors"
          >
            Create account
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
