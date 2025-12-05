import { useState } from 'react';
import { postJSON } from '../api';
import { setAuthToken, decodeToken } from '../auth';
import { Link, useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await postJSON<{ token: string }>('/auth/login', { email, password });
      const user = decodeToken(res.token);
      if (!user) throw new Error('Invalid token');
      setAuthToken(res.token);
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 420, margin: '0 auto' }}>
      <h2>Login</h2>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <button type="submit">Login</button>
      </form>
      <div style={{ marginTop: 12, fontSize: 12, color: '#475569' }}>
        아직 계정이 없다면 <Link to="/signup">회원가입</Link> 후 바로 사용할 수 있습니다.
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
        Demo users: sales@example.com / rd@example.com / exec@example.com / admin@example.com (pwd: password)
      </div>
    </div>
  );
}
