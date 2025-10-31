'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { signIn } from "next-auth/react";
import SignInModal from "./SignIn";
import { Button } from "antd";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}


export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [navVisible, setNavVisible] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleNav = () => setNavVisible(!navVisible);
  const closeNav = () => setNavVisible(false);

  const handleBookDemoClick = () => {
    // Fire Google Ads conversion tag
    if (typeof window !== "undefined" && typeof window.gtag !== "undefined") {
      window.gtag('event', 'conversion', {
        send_to: 'AW-17688003710/AbCdEfGhIjKLMn',
      });
    }
  };

  const handleSignIn = async () => {
    await signIn("credentials", {
      redirect: true,
      callbackUrl: "/"
    });
  };

  return (
    <>
      <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="container header-container">
          <Link href="/" className="logo" aria-label="Nobstacle homepage">
            <Image src="/Logo_Light.png" alt="Nobstacle Logo" width={150} height={36} />
          </Link>

          <nav className="main-nav" data-visible={navVisible}>
            <ul>
              <li className="nav-dropdown">
                <a href="#product-tour">Products</a>
                <div className="nav-dropdown-content">
                  <div className="dropdown-links">
                    <a href="#product-tour" onClick={closeNav}>Upselling</a>
                    <a href="#product-tour" onClick={closeNav}>Display</a>
                    <a href="#product-tour" onClick={closeNav}>Forms</a>
                  </div>
                  <div className="dropdown-image">
                    <Image src="/PunkyHotel.png" alt="Hotel Lobby" fill style={{ objectFit: 'cover' }} />
                    <span>See Interactive Product Demo</span>
                  </div>
                </div>
              </li>
              <li><a href="#features" onClick={closeNav}>Features</a></li>
              <li><a href="#pricing" onClick={closeNav}>Pricing</a></li>
              <li><a href="#faq" onClick={closeNav}>FAQ</a></li>
              <li><a href="#contact" onClick={closeNav}>Contact</a></li>

              {/* Mobile-only */}
              <li className="mobile-only">
                <Button
                  className="signin-link-mobile"
                  onClick={() => { setSignInOpen(true); closeNav(); }}
                >
                  Sign In
                </Button>
              </li>
              <li className="mobile-only">
                <a
                  href="#contact"
                  className="cta-button-mobile"
                  onClick={() => {
                    handleBookDemoClick();
                    closeNav();
                  }}
                >
                  Book a Demo
                </a>
              </li>
            </ul>
          </nav>

          <div className="nav-actions">
            <Button className="signin-link" onClick={() => setSignInOpen(true)}>Sign In</Button>
            <a
              href="#contact"
              className="cta-button-header"
              onClick={handleBookDemoClick}
            >
              Book a Demo
            </a>

            <button
              className="mobile-nav-toggle"
              aria-controls="main-nav"
              aria-expanded={navVisible}
              onClick={toggleNav}
            >
              <span className="sr-only">Menu</span>
              <ion-icon name={navVisible ? 'close-outline' : 'menu-outline'}></ion-icon>
            </button>
          </div>
        </div>
      </header>

      <SignInModal isOpen={signInOpen} onClose={() => setSignInOpen(false)} />
    </>
  );
}
