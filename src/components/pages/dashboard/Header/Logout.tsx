"use client";
import * as React from "react";
import { Button } from "../../../Button";
import { logoutClientSession } from "../../../../lib/logout";

export const Logout: React.FC = () => {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      await logoutClientSession();

    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: navigate to NextAuth signout endpoint directly
      window.location.replace("/api/auth/clear-session");
    }
  };

  return (
    <Button
      className="text-white"
      onClick={handleLogout}
      disabled={isLoggingOut}
    >
      {isLoggingOut ? 'Logging out...' : 'Logout'}
    </Button>
  );
};