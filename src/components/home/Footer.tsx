import { FaLinkedin, FaFacebook, FaYoutube, FaInstagram } from 'react-icons/fa';

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
            <p>16192 Coastal HWY Lewes, DE 19958 USA</p>
            <p>
              <a href="tel:+13025488798">+1 (302) 548-8798</a>
            </p>
            <p>
              <a href="mailto:info@nobstacle.com">info@nobstacle.com</a>
            </p>
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
              <li><a href="/privacy">Privacy Policy</a></li>
              <li><a onClick={onTermsClick}>Terms of Service</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Follow Us</h4>
            <div className="social-links">
              <a href="https://www.linkedin.com/company/109410250" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><FaLinkedin /></a>
              <a href="https://www.facebook.com/people/Nobstacle/61564784671981/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><FaFacebook /></a>
              <a href="https://www.youtube.com/@NobstacleApp" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><FaYoutube /></a>
              <a href="https://www.instagram.com/nobstacle_com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><FaInstagram /></a>
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
