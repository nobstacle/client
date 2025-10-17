// components/Footer.tsx
interface FooterProps {
  onPrivacyClick: () => void;
  onTermsClick: () => void;
}

export default function Footer({ onPrivacyClick, onTermsClick }: FooterProps) {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <h4>Nobstacle LLC</h4>
            <p>Moving desks to cloud</p>
          </div>
          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#contact">Book a Demo</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <ul>
              <li><a onClick={onPrivacyClick}>Privacy Policy</a></li>
              <li><a onClick={onTermsClick}>Terms of Service</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Follow Us</h4>
            <div className="social-links">
              <a href="#" aria-label="Twitter"><ion-icon name="logo-twitter"></ion-icon></a>
              <a href="#" aria-label="LinkedIn"><ion-icon name="logo-linkedin"></ion-icon></a>
              <a href="#" aria-label="Facebook"><ion-icon name="logo-facebook"></ion-icon></a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 Nobstacle LLC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}