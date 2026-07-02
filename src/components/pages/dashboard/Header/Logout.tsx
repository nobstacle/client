"use client";
import * as React from "react";
import { Button } from "../../../Button";
import { signOut } from "next-auth/react";

export const Logout: React.FC = () => {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      // Clear client-side storage
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }

      // Notify extension before signOut
      if (typeof window !== 'undefined') {
        window.postMessage({ type: 'LOGOUT_REQUEST' }, '*');
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'LOGOUT_REQUEST' }, '*');
        }
      }

      // Use redirect: true so the server handles cookie clearing via Set-Cookie
      // headers (httpOnly cookies cannot be cleared via document.cookie)
      await signOut({ redirect: true, callbackUrl: '/' });

    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: navigate to NextAuth signout endpoint directly
      window.location.href = '/api/auth/signout?callbackUrl=%2F';
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