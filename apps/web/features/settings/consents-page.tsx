'use client';

import { PageLoading } from '@/components/shell/page-loading';
import { useApiMutation } from '@/lib/query/mutations';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { Alert, Button, Card, CardDescription, CardHeader, CardTitle, Skeleton } from '@urgent/ui';
import { formatDate } from '@urgent/utils';
import { isApiError } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import { useSession } from '@/lib/auth/client';
import { REQUIRED_CONSENTS } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/keys';
import { latestConsentFor, useConsentHistory } from './consent-state';

type ConsentType = components['schemas']['ConsentType'];
type ConsentView = components['schemas']['ConsentViewDto'];
type Policy = components['schemas']['PolicyVersionDto'];

const POLICY_INFO: Record<ConsentType, { label: string; description: string; href: string }> = {
  TERMS_OF_SERVICE: { label: 'Terms of Service', description: 'Rules for using Urgent.ng.', href: '/terms' },
  PRIVACY_POLICY: { label: 'Privacy Policy', description: 'How account and service data is handled.', href: '/privacy' },
  SAFETY_POLICY: { label: 'Safety Policy', description: 'Safety expectations for every errand.', href: '/help' },
  PROHIBITED_ITEMS_POLICY: { label: 'Prohibited Items Policy', description: 'Items that cannot be requested or carried.', href: '/terms' },
  OFFLINE_PAYMENT_TERMS: { label: 'Offline Payment Terms', description: 'Payment arrangements between requesters and runners.', href: '/help' },
  LOCATION_SHARING: { label: 'Location sharing', description: 'Share your live location during an active assignment.', href: '/privacy' },
  MARKETING_COMMUNICATIONS: { label: 'Marketing communications', description: 'Receive optional product news and offers.', href: '/privacy' },
};

const OPTIONAL_CONSENTS: ConsentType[] = ['LOCATION_SHARING', 'MARKETING_COMMUNICATIONS'];

function policyFor(policies: Policy[], type: ConsentType): Policy | undefined {
  return policies.find((policy) => policy.type === type);
}

function consentStatus(consents: ConsentView[], type: ConsentType): ConsentView | undefined {
  return latestConsentFor(consents, type);
}

function ErrorPanel({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const requestId = isApiError(error) ? error.requestId : undefined;
  const forbidden = isApiError(error) && error.status === 403;
  return (
    <Alert variant="danger" role="alert">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p>{forbidden ? 'You do not have permission to view consent settings.' : 'We could not load or update consent settings.'}</p>
          {requestId && <p className="mt-1 text-xs">Request ID: {requestId}</p>}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onRetry}>Try again</Button>
      </div>
    </Alert>
  );
}

function StatusBadge({ active, label }: { active: boolean; label?: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${active ? 'bg-ok-bg text-ok' : 'bg-panel text-muted'}`}>
      {label ?? (active ? 'Enabled' : 'Not enabled')}
    </span>
  );
}

function OptionalConsentCard({
  type,
  policy,
  consent,
  busy,
  onAccept,
  onWithdraw,
}: {
  type: ConsentType;
  policy?: Policy;
  consent?: ConsentView;
  busy: boolean;
  onAccept: (type: ConsentType, version: string) => void;
  onWithdraw: (id: string) => void;
}) {
  const info = POLICY_INFO[type];
  const enabled = Boolean(consent && consent.withdrawnAt === null);
  const isCurrent = Boolean(policy && consent?.version === policy.version);

  return (
    <article className="rounded-[var(--r)] border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-ink">{info.label}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">{info.description}</p>
        </div>
        <StatusBadge active={enabled} label={!enabled && consent?.withdrawnAt ? 'Withdrawn' : undefined} />
      </div>
      <p className="mt-3 text-[11px] text-muted">
        {enabled && consent
          ? `Accepted ${formatDate(consent.acceptedAt, 'short')} · version ${consent.version}${isCurrent ? '' : ' · a newer version is available'}`
          : policy
            ? `Current version ${policy.version}`
            : 'No current published version is available.'}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <Link href={info.href} className="text-xs font-bold text-green-800 hover:underline">Read policy</Link>
        <span className="flex flex-wrap gap-2">
          {enabled && consent ? (
            <>
              {!isCurrent && policy ? (
                <Button type="button" size="sm" disabled={busy} onClick={() => onAccept(type, policy.version)}>
                  {busy ? 'Updating…' : 'Accept current version'}
                </Button>
              ) : null}
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onWithdraw(consent.id)}>
                {busy ? 'Updating…' : 'Withdraw consent'}
              </Button>
            </>
          ) : policy ? (
            <Button type="button" size="sm" disabled={busy} onClick={() => onAccept(type, policy.version)}>
              {busy ? 'Updating…' : consent ? 'Accept again' : 'Enable'}
            </Button>
          ) : null}
        </span>
      </div>
    </article>
  );
}

export function ConsentsPage() {
  const { me } = useSession();
  const queryClient = useQueryClient();
  const history = useConsentHistory(me.id);
  const policies = useQuery({
    queryKey: queryKeys.reference.policies('current'),
    queryFn: authApi.policies,
    staleTime: 5 * 60_000,
  });
  const refreshHistory = () => queryClient.invalidateQueries({ queryKey: queryKeys.consents.history(me.id) });
  const acceptConsent = useApiMutation({ affects: ['consents'],
    mutationFn: ({ type, version }: { type: ConsentType; version: string }) => authApi.acceptConsent({ type, version }),
    onSuccess: refreshHistory,
  });
  const withdrawConsent = useApiMutation({ affects: ['consents'],
    mutationFn: (consentId: string) => authApi.withdrawConsent(consentId),
    onSuccess: refreshHistory,
  });
  const actionError = acceptConsent.error ?? withdrawConsent.error;
  const isBusy = acceptConsent.isPending || withdrawConsent.isPending;

  if (history.isLoading || policies.isPending) {
    return <PageLoading title="Privacy & consents" eyebrow="Account" width="max-w-4xl" cards={[320, 320]} />;
  }

  if (history.error || policies.error || !history.data || !policies.data) {
    const retry = () => { void history.refetch(); void policies.refetch(); };
    return (
      <div className="mx-auto grid max-w-3xl gap-4">
        <h1 className="text-2xl font-extrabold text-ink">Privacy &amp; consents</h1>
        {history.error ? <ErrorPanel error={history.error} onRetry={retry} /> : null}
        {policies.error ? <ErrorPanel error={policies.error} onRetry={retry} /> : null}
        {!history.error && !policies.error && (!history.data || !policies.data) ? (
          <Alert variant="danger" role="alert">
            <p>Your consent settings did not return data.</p>
            <Button type="button" variant="ghost" size="sm" onClick={retry}>Try again</Button>
          </Alert>
        ) : null}
      </div>
    );
  }

  const currentPolicies = policies.data;
  const consents = history.data.consents;
  const outstandingTypes = new Set(history.data.outstanding.map((policy) => policy.type));

  return (
    <div className="mx-auto grid max-w-5xl content-start gap-5">
      <header className="px-1">
        <p className="text-[11px] font-extrabold uppercase tracking-[.12em] text-green">Account</p>
        <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-[32px]">Privacy &amp; consents</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">Review the policies you’ve accepted and control optional location sharing and marketing permissions.</p>
      </header>

      {outstandingTypes.size > 0 && (
        <Alert variant="info" className="flex flex-wrap items-center justify-between gap-3">
          <span>You have updated required policies to review.</span>
          <Link href="/policy-acceptance" className="font-bold underline">Review policy updates</Link>
        </Alert>
      )}
      {actionError && <ErrorPanel error={actionError} onRetry={() => { acceptConsent.reset(); withdrawConsent.reset(); void refreshHistory(); }} />}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]">
        <div className="grid content-start gap-4">
          <Card variant="tint">
            <CardHeader>
              <div><CardTitle>Optional consents</CardTitle><CardDescription>These permissions are separate from required service policies and can be changed at any time.</CardDescription></div>
            </CardHeader>
            <div className="grid gap-3">
              {OPTIONAL_CONSENTS.map((type) => (
                <OptionalConsentCard
                  key={type}
                  type={type}
                  policy={policyFor(currentPolicies, type)}
                  consent={consentStatus(consents, type)}
                  busy={isBusy}
                  onAccept={(nextType, version) => acceptConsent.mutate({ type: nextType, version })}
                  onWithdraw={(id) => withdrawConsent.mutate(id)}
                />
              ))}
            </div>
            <p className="mt-4 rounded-xl bg-white/70 p-3 text-xs leading-relaxed text-muted">
              Withdrawing location sharing takes effect immediately. The next live-location request will ask for consent again before using your location.
            </p>
          </Card>

          <Card>
            <CardHeader><div><CardTitle>Required policies</CardTitle><CardDescription>Required to use the service; recorded here for reference and cannot be withdrawn.</CardDescription></div></CardHeader>
            <ul className="divide-y divide-line">
              {REQUIRED_CONSENTS.map((type) => {
                const info = POLICY_INFO[type];
                const consent = consentStatus(consents, type);
                const active = Boolean(consent && consent.withdrawnAt === null);
                const current = policyFor(currentPolicies, type);
                return (
                  <li key={type} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-panel text-muted"><span aria-hidden="true" className="text-sm font-extrabold">§</span></span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-[13px] text-ink">{info.label}</strong>
                      <span className="block text-[11px] text-muted">{active && consent ? `Accepted ${formatDate(consent.acceptedAt, 'short')} · version ${consent.version}` : current ? `Current version ${current.version} · acceptance needed` : 'No acceptance recorded'}</span>
                    </span>
                    <StatusBadge active={active} label={outstandingTypes.has(type) ? 'Update required' : active ? 'Required' : 'Needs review'} />
                    <Link href={info.href} aria-label={`Read ${info.label}`} className="shrink-0 text-xs font-bold text-green-800 hover:underline">Read</Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        <Card>
          <CardHeader><div><CardTitle>Consent history</CardTitle><CardDescription>Accepted and withdrawn permissions, newest first.</CardDescription></div></CardHeader>
          {consents.length ? (
            <ol className="grid">
              {consents.map((consent, index) => {
                const info = POLICY_INFO[consent.type];
                return (
                  <li key={consent.id} className="relative flex gap-3 pb-4 last:pb-0">
                    <span aria-hidden="true" className={`relative z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${consent.withdrawnAt ? 'bg-panel text-muted' : 'bg-tint-2 text-green-900'}`}>{consent.withdrawnAt ? '–' : '✓'}</span>
                    {index < consents.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[13px] top-7 w-px bg-line" />}
                    <span className="min-w-0 pt-0.5">
                      <strong className="block text-[12px] text-ink">{info.label} · v{consent.version}</strong>
                      <span className="block text-[11px] text-muted">Accepted {formatDate(consent.acceptedAt, 'short')}</span>
                      {consent.withdrawnAt && <span className="block text-[11px] font-semibold text-muted">Withdrawn {formatDate(consent.withdrawnAt, 'short')}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="rounded-xl border border-dashed border-line bg-panel/60 px-4 py-6 text-center">
              <p className="text-sm font-semibold text-ink">No consent history yet.</p>
              <p className="mt-1 text-xs text-muted">When you enable an optional consent, its record will appear here.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
