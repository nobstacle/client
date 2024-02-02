"use client";
import * as React from "react";
import { Button } from "../../../Button";
import { signOut } from "next-auth/react";

export const Logout: React.FC = () => {
  const handleLogout = async () => {
    localStorage.clear();
    await signOut();
  };
  return (
    <Button className="  text-white" onClick={handleLogout}>
      {" "}
      Logout{" "}
    </Button>
  );
};
