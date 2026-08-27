// components/SignInModal.tsx
'use client';


import React, {  useState, useEffect  } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { Modal } from "antd";
interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();

  const showTrialExpiredPopup = (message: string) => {
    Modal.error({
      title: "Trial Expired",
      content:
        message ||
        "Your trial has expired. Please contact support or upgrade your plan to continue.",
      okText: "Close",
      centered: true,
    });
  };

  const normalizeSignInError = (rawError?: string | null) => {
    if (!rawError) {
      return "Invalid email or password";
    }

    const decoded = decodeURIComponent(rawError);
    if (
      decoded.toLowerCase().includes("trial") &&
      decoded.toLowerCase().includes("expired")
    ) {
      return decoded;
    }

    if (decoded === "CredentialsSignin") {
      return "Invalid email or password";
    }

    return decoded;
  };

  const redirectuser = (sessionData: any) => {
    let userRole = sessionData?.user?.Roles?.[0];
    if (!sessionData?.user?.companyId && userRole !== "SAdmin") {
      window.location.href = "/onboard/create-company";
    } else if (userRole === "SAdmin") {
      window.location.href = "/dashboard/register";
    } else if (userRole === "Admin" || userRole === "Staff") {
      window.location.href = "/dashboard/text";
    } else {
      window.location.href = "/client";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      const message = normalizeSignInError(result.error);
      if (
        message.toLowerCase().includes("trial") &&
        message.toLowerCase().includes("expired")
      ) {
        showTrialExpiredPopup(message);
      }
      setError(message);
      setLoading(false);
    } else if (result?.ok) {
      const { getSession } = await import("next-auth/react");
      const currentSession = await getSession();
      if (currentSession) {
        redirectuser(currentSession);
      } else {
        window.location.reload();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md customMobileConditions">
        <h2 className="text-2xl font-bold mb-6">Sign In</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          {error && <p className="text-red-600 mb-4">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <button
          onClick={onClose}
          className="mt-4 w-full text-gray-600 hover:text-gray-800"
        >
          Close
        </button>

        <p className="mt-4 text-center text-sm text-gray-600">
          Need an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-blue-600 hover:text-blue-700"
            onClick={onClose}
          >
            Start your 30-day trial
          </Link>
        </p>
      </div>
    </div>
  );
}
