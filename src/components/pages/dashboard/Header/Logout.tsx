"use client";
import * as React from "react";
import { Button } from "../../../Button";
import { signOut } from "next-auth/react";

export const Logout: React.FC = () => {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        console.log('✓ Local storage cleared');
      }

      // 1. Wait for NextAuth signOut to complete clearing NextAuth cookies/session
      await signOut({
        redirect: false
      });
      console.log('✓ NextAuth signOut completed');

      // 2. Notify extension
      if (typeof window !== 'undefined') {
        window.postMessage({ type: 'LOGOUT_REQUEST' }, '*');
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'LOGOUT_REQUEST' }, '*');
        }
        console.log('✓ Extension logout request sent');
      }

      // 3. Redirect manually
      window.location.href = '/';

    } catch (error) {
      try {
        await signOut({ redirect: false });
      } catch (e) {
        console.error('NextAuth signOut error:', e);
      }
      window.location.href = '/';
    } finally {
      setIsLoggingOut(false);
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