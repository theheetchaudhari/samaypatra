import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import './layout.css';

export default function Layout({ showFooter = true }) {
  return (
    <div className="samaypatra-shell">
      <Navbar />
      <main className="main-viewport">
        <Outlet />
      </main>
      {showFooter && <Footer />}
    </div>
  );
}
