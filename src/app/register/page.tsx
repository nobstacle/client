"use client";

import Image from "next/image";
import Link from "next/link";
import { RegisterForm } from "../../components/pages/register/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen w-full bg-white">
      {/* Left Panel - Branding (Desktop Only) */}
      <div className="hidden lg:flex lg:w-2/5 flex-col justify-center bg-primary p-12 text-white relative overflow-hidden">
        {/* Decorative background circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10">
          <Image 
            src="/Logo_Light.png" 
            alt="Nobstacle Logo" 
            width={180} 
            height={43}
            className="mb-8"
          />
          
          <h1 className="text-4xl font-bold leading-tight">
            Start your 30-day free trial
          </h1>
          <p className="mt-4 text-lg text-white/80">
            Transform your customer experience with powerful display and upselling tools.
          </p>
          
          <ul className="mt-8 space-y-4">
            <li className="flex items-center gap-3">
              <svg className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Unlimited users and stations</span>
            </li>
            <li className="flex items-center gap-3">
              <svg className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>No credit card required</span>
            </li>
            <li className="flex items-center gap-3">
              <svg className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Full feature access</span>
            </li>
            <li className="flex items-center gap-3">
              <svg className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Multi-language support</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex w-full lg:w-3/5 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <Image 
              src="/Logo_Light.png" 
              alt="Nobstacle Logo" 
              width={150} 
              height={36}
            />
          </div>
          
          <RegisterForm />
          
          <p className="mt-8 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/" className="font-semibold text-primary hover:text-primary-dark transition-colors">
              Sign in
            </Link>
          </p>
          
          <p className="mt-4 text-center text-xs text-gray-500">
            By registering, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </main>
  );
}
