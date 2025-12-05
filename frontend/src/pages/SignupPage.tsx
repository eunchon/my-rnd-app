import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { postJSON } from '../api';
import { decodeToken, setAuthToken } from '../auth';

const ROLE_OPTIONS = [
  { value: 'SALES', label: 'Sales' },
  { value: 'RD', label: 'R&D' },
  { value: 'EXEC', label: 'Executive' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'VIEWER', label: 'Viewer' },
];

export default function SignupPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    dept: '',
    organization: '',
    role: 'SALES',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await postJSON<{ token: string }>(
        '/auth/signup',
        {
          name: form.name,
          email: form.email,
          password: form.password,
          dept: form.dept,
          organization: form.organization,
          role: form.role,
        }
      );
      const user = decodeToken(res.token);
      if (!user) throw new Error('Invalid token');
      setAuthToken(res.token);
      navigate('/');
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'Signup failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 460, margin: '0 auto' }}>
      <h2>회원 가입</h2>
      <p style={{ color: '#475569', marginBottom: 16 }}>역할에 맞는 정보를 입력하면 즉시 로그인됩니다.</p>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>이름</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>이메일</label>
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>비밀번호</label>
          <input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>부서</label>
            <input required value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>소속/조직명</label>
            <input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} placeholder="(선택)" />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>역할</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <button type="submit" disabled={submitting}>
          {submitting ? '가입 중...' : '가입하기'}
        </button>
      </form>
      <div style={{ marginTop: 16, fontSize: 13 }}>
        이미 계정이 있다면 <Link to="/login">로그인</Link>
      </div>
    </div>
  );
}
