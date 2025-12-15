import { useEffect, useState } from 'react';
import { fetchJSON, postJSON } from '../api';

type User = {
  id: string;
  name: string;
  email: string;
  dept: string;
  role: string;
  organization?: string | null;
  createdAt: string;
};

const ROLE_OPTIONS = ['ADMIN', 'EXEC', 'RD', 'SALES', 'VIEWER'];

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', dept: '', organization: '', role: 'VIEWER' });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJSON<User[]>('/admin/users');
      setUsers(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await postJSON('/admin/users', form);
      setForm({ name: '', email: '', password: '', dept: '', organization: '', role: 'VIEWER' });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const resetPassword = async (id: string) => {
    const pwd = prompt('새 비밀번호를 입력하세요 (6자 이상)');
    if (!pwd || pwd.length < 6) return;
    setLoading(true);
    setError(null);
    try {
      await postJSON(`/admin/users/${id}/reset-password`, { newPassword: pwd });
      alert('비밀번호가 초기화되었습니다.');
    } catch (e: any) {
      setError(e?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h2>관리자: 사용자 관리</h2>
      <p style={{ color: '#475569', marginBottom: 16 }}>계정 생성, 목록 확인, 비밀번호 초기화를 할 수 있습니다.</p>
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}

      <form onSubmit={createUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, padding: 12, border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 20, background: '#f8fafc' }}>
        <input placeholder="이름" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="이메일" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="비밀번호(6자 이상)" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <input placeholder="부서" required value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })} />
        <input placeholder="조직/소속(선택)" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button type="submit" disabled={creating} style={{ gridColumn: '1 / -1', padding: '10px 12px' }}>
          {creating ? '생성 중...' : '새 사용자 생성'}
        </button>
      </form>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr 1fr 1fr', gap: 6, padding: 10, background: '#f8fafc', fontWeight: 700 }}>
          <div>이메일</div>
          <div>이름</div>
          <div>부서</div>
          <div>역할</div>
          <div>조직</div>
          <div>액션</div>
        </div>
        {loading && <div style={{ padding: 12 }}>로딩 중...</div>}
        {!loading && users.map((u) => (
          <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr 1fr 1fr', gap: 6, padding: 10, borderTop: '1px solid #e2e8f0', alignItems: 'center' }}>
            <div>{u.email}</div>
            <div>{u.name}</div>
            <div>{u.dept}</div>
            <div>{u.role}</div>
            <div>{u.organization || '-'}</div>
            <div>
              <button onClick={() => resetPassword(u.id)} style={{ padding: '6px 10px' }}>비번 초기화</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
