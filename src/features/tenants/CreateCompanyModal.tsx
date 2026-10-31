import { useNavigate } from 'react-router';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/toast-context';
import { CreateCompanyForm } from './CreateCompanyForm';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** "New company" popup shown over the current page (background blurred). */
export function CreateCompanyModal({ open, onClose }: Props) {
  const navigate = useNavigate();
  const toast = useToast();

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Create a new company"
      description="Each company is a separate workspace with its own customers, vehicles, jobs and invoices."
    >
      <CreateCompanyForm
        onCancel={onClose}
        onCreated={(tenant) => {
          onClose();
          navigate(`/t/${tenant.id}/dashboard`);
          toast.success(`${tenant.name} created. You're now working in it.`);
        }}
      />
    </Modal>
  );
}
