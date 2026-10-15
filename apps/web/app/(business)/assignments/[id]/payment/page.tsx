import type { Metadata } from 'next';
import { PaymentAgreementPage } from '@/features/assignments/payment/payment-agreement-page';

export const metadata: Metadata = {
  title: 'Payment Agreement — Urgent.ng',
};

export default async function AssignmentPaymentRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PaymentAgreementPage assignmentId={id} />;
}
