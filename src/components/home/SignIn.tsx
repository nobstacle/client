// components/SignInModal.tsx
'use client';


import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: session, update } = useSession();

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
      setError("Invalid email or password");
      setLoading(false);
    } else if (result?.ok) {
      onClose();
    }
  };

  const redirectuser = (session) => {
    let userRole = session?.user?.Roles[0];
    if (userRole === "SAdmin") {
      window.location.href = "/dashboard/register";
    } else if (userRole === "Admin" || userRole === "Staff") {
      window.location.href = "/dashboard/text";
    } else {
      window.location.href = "/client";
    }
  }

  useEffect(() => {
    if (session) {
      redirectuser(session);
    }
  }, [session]);


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
      </div>
    </div>
  );
}