import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { postJSON } from '../api';
import { decodeToken, setAuthToken } from '../auth';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [token, setToken] = useState(() => params.get('token') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const p = params.get('token');
    if (p) setToken(p);
  }, [params]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await postJSON<{ ok: boolean; token?: string }>('/auth/reset-password', {
        token,
        newPassword: password,
      });
      if (res.token) {
        const user = decodeToken(res.token);
        if (user) {
          setAuthToken(res.token);
        }
      }
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1000);
    } catch (err: any) {
      setError(err?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 460, margin: '0 auto' }}>
      <h2>비밀번호 재설정</h2>
      <p style={{ color: '#475569', marginBottom: 16 }}>받은 토큰과 새 비밀번호를 입력하세요.</p>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>토큰</label>
          <textarea required value={token} onChange={(e) => setToken(e.target.value)} style={{ width: '100%', minHeight: 60 }} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>새 비밀번호 (6자 이상)</label>
          <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        {success && <div style={{ color: 'green' }}>재설정되었습니다. 잠시 후 로그인 페이지로 이동합니다.</div>}
        <button type="submit" disabled={loading}>
          {loading ? '저장 중...' : '비밀번호 재설정'}
        </button>
      </form>
      <div style={{ marginTop: 16, fontSize: 13 }}>
        <Link to="/login">로그인으로 돌아가기</Link>
      </div>
    </div>
  );
}
