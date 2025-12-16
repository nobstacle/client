"use client";
import * as React from "react";
import { Button } from "../../../Button";
import { signOut } from "next-auth/react";

export const Logout: React.FC = () => {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        console.log('✓ Server cookies cleared');
      } else {
        console.warn('⚠ Logout API failed, continuing anyway...');
      }

      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        console.log('✓ Local storage cleared');
      }

      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'LOGOUT_REQUEST'
        }, '*');
        console.log('✓ Extension notified');
      }

      await signOut({
        redirect: false,
        callbackUrl: '/'
      });
      window.location.href = '/';

    } catch (error) {
      await signOut({ redirect: false });
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