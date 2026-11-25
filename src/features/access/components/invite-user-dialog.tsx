import { useApiMutation } from '../../../shared/api/use-api-mutation';
import { FormDialog } from '../../../shared/forms/form-dialog';
import { read } from '../../../shared/forms/form-spec';
import { accessApi } from '../access-api';
import { accessKeys } from '../access-queries';

/** The invite flow, shared by the Users and Invitations pages until its own design lands. */
export function InviteUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const invite = useApiMutation(accessApi.invite, {
    success: 'Undangan terkirim',
    invalidate: [accessKeys.all],
    toastErrors: false,
  });
  return (
    <FormDialog
      open={open}
      title="Undang user"
      description="CORE mengirim tautan pendaftaran lewat email. Akun baru dibuat tanpa role; berikan role dari halaman Users setelah undangan diterima."
      fields={[{ name: 'email', label: 'Email', kind: 'email', required: true, placeholder: 'name@digvation.id' }]}
      submitLabel="Kirim undangan"
      onSubmit={(values) => invite.mutateAsync({ email: read.text(values, 'email').toLowerCase() })}
      onClose={onClose}
    />
  );
}
