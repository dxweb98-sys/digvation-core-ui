import { useState } from 'react';
import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { FormDialog } from '../../../shared/forms/form-dialog';
import { read } from '../../../shared/forms/form-spec';
import { AppAction } from '../../../shared/ui/app-action';
import { DetailItem, DetailList } from '../../../shared/ui/app-dialog';
import { Page, PageHeader, Section } from '../../../shared/ui/page';
import { useAuth } from '../../auth/use-auth';
import { accessApi } from '../access-api';
import { PASSWORD_FIELDS, USERNAME_RULE } from '../password-rules';

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const update = useApiMutation(accessApi.updateProfile, {
    success: 'Profile saved',
    toastErrors: false,
    onSuccess: (result) => setUser(result.user),
  });
  const changePassword = useApiMutation(accessApi.changePassword, {
    success: 'Password changed',
    toastErrors: false,
  });

  if (!user) return null;

  return (
    <Page>
      <PageHeader
        title="My profile"
        actions={
          <>
            <AppAction tone="secondary" onClick={() => setChangingPassword(true)}>
              Change password
            </AppAction>
            <AppAction onClick={() => setEditing(true)}>Edit profile</AppAction>
          </>
        }
      />
      <Section title="Account">
        <DetailList>
          <DetailItem label="Full name">{user.fullname}</DetailItem>
          <DetailItem label="Email">{user.email}</DetailItem>
          <DetailItem label="Username">{user.username}</DetailItem>
          <DetailItem label="Phone">{user.phone_number}</DetailItem>
        </DetailList>
      </Section>

      <FormDialog
        open={editing}
        title="Edit profile"
        fields={[
          { name: 'fullname', label: 'Full name', required: true, maxLength: 150 },
          { name: 'username', label: 'Username', required: true, maxLength: 50, validate: USERNAME_RULE, hint: '3 to 50 lowercase letters, digits, ".", "_" or "-".' },
          { name: 'phone_number', label: 'Phone', maxLength: 30, placeholder: '+6281234567890' },
        ]}
        initialValues={{ fullname: user.fullname, username: user.username, phone_number: user.phone_number ?? '' }}
        submitLabel="Save profile"
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
        title="Change password"
        description="Other sessions stay signed in until their access token expires."
        fields={[{ name: 'current_password', label: 'Current password', kind: 'password', required: true }, ...PASSWORD_FIELDS]}
        submitLabel="Change password"
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
