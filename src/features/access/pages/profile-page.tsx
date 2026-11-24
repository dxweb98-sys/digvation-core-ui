import { useState } from 'react';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { FormDialog } from '../../../shared/forms/form-dialog';
import { read } from '../../../shared/forms/form-spec';
import { AppAction } from '../../../shared/ui/app-action';
import { DetailItem, DetailList } from '../../../shared/ui/app-dialog';
import { LanguageSelect } from '../../../shared/ui/language-select';
import { Page, PageHeader, Section } from '../../../shared/ui/page';
import { useAuth } from '../../auth/use-auth';
import { accessApi } from '../access-api';
import { PASSWORD_FIELDS, USERNAME_RULE } from '../password-rules';

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const update = useApiMutation(accessApi.updateProfile, {
    success: 'Profil disimpan',
    toastErrors: false,
    onSuccess: (result) => setUser(result.user),
  });
  const changePassword = useApiMutation(accessApi.changePassword, {
    success: 'Kata sandi diganti',
    toastErrors: false,
  });

  if (!user) return null;

  return (
    <Page>
      <PageHeader
        title="Profil saya"
        actions={
          <>
            <AppAction tone="secondary" onClick={() => setChangingPassword(true)}>
              Ganti kata sandi
            </AppAction>
            <AppAction onClick={() => setEditing(true)}>Edit profil</AppAction>
          </>
        }
      />
      <Section title="Akun">
        <DetailList>
          <DetailItem label="Nama lengkap">{user.fullname}</DetailItem>
          <DetailItem label="Email">{user.email}</DetailItem>
          <DetailItem label="Username">{user.username}</DetailItem>
          <DetailItem label="Nomor telepon">{user.phone_number}</DetailItem>
        </DetailList>
      </Section>

      <Section title="Tampilan">
        <div className="profile-language">
          <LanguageSelect hint="Berlaku untuk tanggal, waktu dan jumlah uang di browser ini. Teks aplikasi tetap berbahasa Indonesia." />
        </div>
      </Section>

      <FormDialog
        open={editing}
        title="Edit profil"
        fields={[
          { name: 'fullname', label: 'Nama lengkap', required: true, maxLength: 150 },
          { name: 'username', label: 'Username', required: true, maxLength: 50, validate: USERNAME_RULE, hint: '3 sampai 50 huruf kecil, angka, ".", "_" atau "-".' },
          { name: 'phone_number', label: 'Nomor telepon', maxLength: 30, placeholder: '+6281234567890' },
        ]}
        initialValues={{ fullname: user.fullname, username: user.username, phone_number: user.phone_number ?? '' }}
        submitLabel="Simpan profil"
        onSubmit={(values) =>
          update.mutateAsync({
            fullname: read.text(values, 'fullname'),
            username: read.text(values, 'username').toLowerCase(),
            phone_number: read.text(values, 'phone_number') || undefined,
          })
        }
        onClose={() => setEditing(false)}
      />

      <FormDialog
        open={changingPassword}
        title="Ganti kata sandi"
        description="Sesi lain tetap masuk sampai access token-nya kedaluwarsa."
        fields={[{ name: 'current_password', label: 'Kata sandi saat ini', kind: 'password', required: true }, ...PASSWORD_FIELDS]}
        submitLabel="Ganti kata sandi"
        onSubmit={(values) =>
          changePassword.mutateAsync({
            current_password: read.text(values, 'current_password'),
            new_password: read.text(values, 'new_password'),
            confirm_password: read.text(values, 'confirm_password'),
          })
        }
        onClose={() => setChangingPassword(false)}
      />
    </Page>
  );
}
