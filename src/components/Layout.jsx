import { useNavigate } from 'react-router-dom';
import Header from '../sections/Header';
import Footer from '../sections/Footer';

// Layout component with header and footer
const Layout = ({ children, state, actions }) => {
  const routerNavigate = useNavigate();

  // Navigation function to pass to Header using React Router
  const navigate = (path) => {
    if (path === 'vendorLogin') {
      window.location.href = 'http://localhost:3001/vendor';
      return;
    }
    const target = `/${path === 'home' ? '' : path}`;
    routerNavigate(target);
    window.scrollTo(0, 0);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="print:hidden">
        <Header navigate={navigate} state={state} actions={actions} />
      </div>
      <main className="flex-1">
        {children}
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}

export default Layout;