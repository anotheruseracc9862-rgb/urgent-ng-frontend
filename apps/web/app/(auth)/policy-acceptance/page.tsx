import { Metadata } from 'next';
import { PolicyAcceptanceForm } from '@/features/auth/policy-acceptance-form';

export const metadata: Metadata = {
  title: 'Policy Update Required — Urgent.ng',
  description: 'Review and accept updated policies',
};

// In production, this would fetch changed policies from session/API
// and handle the acceptance flow
export default function PolicyAcceptancePage() {
  // Mock data - in production this comes from the intercepted request context
  const mockChangedPolicies = [
    {
      type: 'PRIVACY_POLICY' as const,
      version: '1.1',
      publishedAt: new Date().toISOString(),
      summary:
        'We have updated our data retention policies to provide more transparency. Location history is now retained for 30 days (previously 90 days), and notification data is kept for 90 days (previously 6 months). These changes give you more control over your personal information.',
    },
  ];

  const handleAccept = async () => {
    // TODO: Call API to record acceptance
    // await apiClient.post('/me/policy-acceptances', {
    //   acceptances: changedPolicies.map(p => ({ type: p.type, version: p.version }))
    // });

    // For now, simulate success and redirect
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // In production, replay the original action that was intercepted
    window.location.href = '/dashboard';
  };

  return <PolicyAcceptanceForm changedPolicies={mockChangedPolicies} onAccept={handleAccept} />;
}
