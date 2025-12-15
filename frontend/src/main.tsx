import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useT, useLang, setLang } from './i18n';
import RequestForm from './pages/RequestForm';
import Dashboard from './pages/Dashboard';
import RequestList from './pages/RequestList';
import RequestDetail from './pages/RequestDetail';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AdminUsers from './pages/AdminUsers';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { getAuthToken, decodeToken, clearAuth } from './auth';

function App() {
  const token = typeof window !== 'undefined' ? getAuthToken() : null;
  const decoded = token ? decodeToken(token) : null;
  const role = decoded?.role || 'external_viewer';
  return (
    <BrowserRouter>
      <RoleAwareLayout role={role} />
    </BrowserRouter>
  );
}

function RoleAwareLayout({ role }: { role: 'viewer' | 'executive' | string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const token = getAuthToken();
  const decoded = token ? decodeToken(token) : null;
  const roleUpper = (decoded?.role || role || '').toString().toUpperCase();
  const onlyList = roleUpper === 'VIEWER' || roleUpper === 'EXTERNAL_VIEWER';
  const t = useT();
  const lang = useLang();
  const name = decoded?.name || '';
  const userRole = roleUpper;
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);
  return (
    <div className="container">
      <header>
        <Link to={onlyList ? '/list' : '/'} className="brand" style={{ textDecoration: 'none', color: 'inherit', gap: 12 }}>
          <img src="/genoray_ci_2-2.png" alt="Genoray" style={{ height: 36, objectFit: 'contain' }} />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 18, cursor: 'pointer' }}>{t('app_title')}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: -2 }}>R&D Intake & Insight</div>
          </div>
        </Link>
        <nav>
          {!onlyList && token && <Link className={isActive('/') ? 'active' : ''} to="/">{t('nav_dashboard')}</Link>}
          {token && <Link className={isActive('/list') ? 'active' : ''} to="/list">{t('nav_list')}</Link>}
          {!onlyList && token && userRole !== 'external_viewer' && <Link className={isActive('/request') ? 'active' : ''} to="/request">{t('nav_new')}</Link>}
          {roleUpper === 'ADMIN' && token && <Link className={isActive('/admin') ? 'active' : ''} to="/admin">Admin</Link>}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {token ? (
            <>
              <span style={{ color: '#666', fontWeight: 600 }}>{name} · {userRole}</span>
              <button onClick={() => { clearAuth(); navigate('/login', { replace: true }); }} style={{ padding: '6px 10px' }}>Logout</button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to="/login">Login</Link>
              <Link to="/signup">Sign up</Link>
            </div>
          )}
          <select aria-label="language" value={lang} onChange={(e) => setLang(e.target.value as any)} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
        </div>
      </header>
      <Routes>
        {!token && <Route path="*" element={<Navigate to="/login" replace />} />}
        {token && onlyList && location.pathname === '/' && <Route path="/" element={<Navigate to="/list" replace />} />}
        {token && !onlyList && <Route path="/" element={<Dashboard />} />}
        {token && <Route path="/list" element={<RequestList />} />}
        {token && <Route path="/list/:id" element={<RequestDetail readOnly={onlyList} />} />}
        {token && <Route path="/request/:id" element={<RequestDetail readOnly={onlyList} />} />}
        {token && !onlyList && userRole !== 'external_viewer' && <Route path="/request" element={<RequestForm />} />}
        {token && roleUpper === 'ADMIN' && <Route path="/admin" element={<AdminUsers />} />}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* Fallback */}
        <Route path="*" element={<Navigate to={token ? (onlyList ? '/list' : '/') : '/login'} replace />} />
      </Routes>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
