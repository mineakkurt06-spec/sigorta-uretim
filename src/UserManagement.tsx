import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

interface ProfileUser {
  id: string;
  full_name: string | null;
  role: string;
  company_id: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<ProfileUser[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfileAndUsers();
  }, []);

  const fetchProfileAndUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (profile) {
      setCompanyId(profile.company_id);

      const { data: teamMembers } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', profile.company_id);

      if (teamMembers) setUsers(teamMembers as ProfileUser[]);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    if (!companyId) {
      setError('Şirket bilgisi bulunamadı.');
      setLoading(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newEmail,
      password: newPassword,
    });

    if (authError) {
      setError('Hata: ' + authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            company_id: companyId,
            full_name: fullName,
            role: 'staff',
          },
        ]);

      if (profileError) {
        setError('Ekleme Engellendi: ' + profileError.message);
      } else {
        setMessage('Personel başarıyla eklendi!');
        setNewEmail('');
        setNewPassword('');
        setFullName('');
        fetchProfileAndUsers();
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '100%', margin: '20px 0', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: '#0f172a' }}>Acente Personel Yönetimi</h3>
      <p style={{ marginBottom: '16px', color: '#475569' }}>Kullanılan Kontenjan: <strong>{users.length} / 3</strong></p>

      {message && <p style={{ color: '#15803d', backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '6px', marginBottom: '10px' }}>{message}</p>}
      {error && <p style={{ color: '#b91c1c', backgroundColor: '#fef2f2', padding: '10px', borderRadius: '6px', marginBottom: '10px' }}>{error}</p>}

      <form onSubmit={handleAddUser}>
        <input
          type="text"
          placeholder="Personel Ad Soyad"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
        />
        <input
          type="email"
          placeholder="Personel E-posta"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          required
          style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
        />
        <input
          type="password"
          placeholder="Personel Şifre"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '10px 16px', backgroundColor: '#0f766e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
          {loading ? 'Ekleniyor...' : 'Yeni Personel Ekle'}
        </button>
      </form>

      <h4 style={{ marginTop: '24px', fontWeight: '600', color: '#1e293b' }}>Mevcut Kullanıcılar</h4>
      <ul style={{ listStyle: 'none', padding: 0, marginTop: '8px' }}>
        {users.map((u) => (
          <li key={u.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
            <span>{u.full_name || 'İsimsiz'}</span>
            <strong style={{ color: u.role === 'admin' ? '#0f766e' : '#64748b' }}>{u.role === 'admin' ? 'Ana Yönetici' : 'Personel'}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}