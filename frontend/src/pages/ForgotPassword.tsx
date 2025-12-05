import { useState } from 'react';
import { Link } from 'react-router-dom';
import { postJSON } from '../api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await postJSON<{ ok: boolean; resetToken?: string }>(
        '/auth/forgot-password',
        { email }
      );
      setSent(true);
      setToken(res.resetToken ?? null); // demo: backend returns token directly
    } catch (err: any) {
      setError(err?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 460, margin: '0 auto' }}>
      <h2>비밀번호 재설정 요청</h2>
      <p style={{ color: '#475569', marginBottom: 16 }}>
        가입한 이메일을 입력하세요. 재설정 토큰을 전달합니다.
      </p>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>이메일</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? '전송 중...' : '재설정 링크 받기'}
        </button>
      </form>
      {sent && (
        <div style={{ marginTop: 14, padding: 12, background: '#ecfeff', border: '1px solid #bae6fd', borderRadius: 10, fontSize: 13 }}>
          요청이 접수되었습니다. 데모 모드에서는 토큰이 아래에 표시됩니다.
          {token && (
            <div style={{ marginTop: 8, wordBreak: 'break-all', fontFamily: 'monospace', fontSize: 12 }}>
              {token}
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <Link to={`/reset-password${token ? `?token=${encodeURIComponent(token)}` : ''}`}>재설정 페이지로 이동</Link>
          </div>
        </div>
      )}
      <div style={{ marginTop: 16, fontSize: 13 }}>
        <Link to="/login">로그인으로 돌아가기</Link>
      </div>
    </div>
  );
}
