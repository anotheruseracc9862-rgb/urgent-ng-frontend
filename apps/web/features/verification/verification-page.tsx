'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@urgent/api-client';
import { Alert, Button, Skeleton } from '@urgent/ui';
import { CheckCircle2, Clock3, ShieldCheck } from 'lucide-react';
import { PageHead } from '@/components/shell/page-head';
import { MediaUpload } from '@/components/media-upload/media-upload';
import { useSession } from '@/lib/auth/client';
import { ApiError, isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { rememberPendingOrder } from '@/features/billing/checkout';
import { ContactMethodsForm } from '@/features/settings/contact-methods-form';
import { verificationApi, type BillingOrder, type VerificationAttempt } from './api';
import { DateOfBirthPicker } from './date-of-birth-picker';

type Identity = components['schemas']['IdentityDetailsDto'];
type IdDocumentType = components['schemas']['IdDocumentType'];
type IdType = 'NIN' | 'BVN';
type Relationship = components['schemas']['GuarantorRelationship'];

const failureCopy: Record<NonNullable<VerificationAttempt['failureReason']>, string> = {
  DOCUMENT_INVALID: 'We could not read the identity document. Check that the image is clear and all details are visible, then try again.',
  SELFIE_MISMATCH: 'The selfie did not match the identity details. Take a new selfie in good light without a hat or sunglasses.',
  IDENTITY_MISMATCH: 'The identity details did not match the verification record. Enter your name, date of birth and ID number exactly as they appear on your NIN or BVN record, then try again.',
  PROVIDER_ERROR: 'The identity verification service could not complete the check. Your fee will be refunded if one was charged. Try again later.',
  PROVIDER_TIMEOUT: 'The identity verification service took too long to respond. Your fee will be refunded if one was charged. Try again later.',
  DUPLICATE_IDENTITY: 'This identity is already registered to another account. Contact support if you believe this is a mistake.',
  USER_CANCELLED: 'The verification was cancelled before it could finish. You can start a new attempt when you are ready.',
  INSUFFICIENT_DATA: 'There was not enough information to complete the check. Review your details and try again.',
  MANUAL_REVIEW_REQUIRED: 'Your details need a manual review. We will update you when the review is complete.',
  OTHER: 'We could not verify these details. Review your information or contact support for help.',
};

const reasonCopy: Record<string, string> = {
  PHONE_NOT_VERIFIED: 'Verify your phone number before you start runner verification.',
  VERIFICATION_COOLDOWN: 'Your next verification attempt is not available yet.',
};

const dateLabel = (value: string) =>
  new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  }).format(new Date(value));

const isPending = (attempt: VerificationAttempt | null | undefined) =>
  attempt?.displayStatus === 'PENDING';

function requestId(error: unknown): string | undefined {
  return isApiError(error) ? error.requestId : undefined;
}

function retryAt(error: unknown): string | undefined {
  if (!isApiError(error)) return undefined;
  const value = error.details.retryAt;
  return typeof value === 'string' ? value : undefined;
}

function friendlyError(error: unknown): string {
  if (!isApiError(error)) return 'We could not complete the request. Please try again.';
  if (error.code === 'VERIFICATION_FEE_REQUIRED') return 'A verification fee is required before you can start.';
  if (error.code === 'VERIFICATION_PENDING') return 'Your verification is still being reviewed.';
  if (error.code === 'DUPLICATE_IDENTITY') return failureCopy.DUPLICATE_IDENTITY;
  if (error.code === 'VERIFICATION_FAILED') {
    const reason = error.details.reason;
    return typeof reason === 'string' && reason in failureCopy
      ? failureCopy[reason as keyof typeof failureCopy]
      : 'We could not verify these details. Review your information or contact support for help.';
  }
  if (error.code === 'MEDIA_INVALID') return 'The selfie could not be used. Upload a new, clear photo.';
  if (error.code === 'VALIDATION_ERROR') return 'Check the identity details and make sure you are at least 18 years old.';
  if (error.code === 'FORBIDDEN') {
    const reason = error.details.reason;
    return typeof reason === 'string'
      ? reasonCopy[reason] ?? 'You cannot start verification right now. Check your account status and try again later.'
      : 'You cannot start verification right now. Check your account status and try again later.';
  }
  return 'We could not complete the verification request. Please try again.';
}

function ErrorNotice({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <Alert variant="danger" role="alert">
      <p>{friendlyError(error)}</p>
      {requestId(error) && <p className="mt-1 text-xs">Request ID: {requestId(error)}</p>}
      <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={onRetry}>Try again</Button>
    </Alert>
  );
}

function StatusCard({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="grid min-w-0 gap-4 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-tint-2 text-green-900"><ShieldCheck aria-hidden="true" className="size-[18px]" /></span>
        <div>
          <h1 className="text-base font-extrabold tracking-tight text-ink">{title}</h1>
          <div className="mt-1 text-xs leading-5 text-muted">{children}</div>
        </div>
      </div>
      {action}
    </section>
  );
}

export function VerificationPage() {
  const { me } = useSession();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [identity, setIdentity] = useState<Identity>({
    firstName: me.firstName,
    lastName: me.lastName,
    dateOfBirth: '',
    addressLine: '',
    lga: '',
  });
  const [documentType, setDocumentType] = useState<IdDocumentType>('NIN_SLIP');
  const [documentMediaId, setDocumentMediaId] = useState<string>();
  const [idType, setIdType] = useState<IdType>('NIN');
  const [idNumber, setIdNumber] = useState('');
  const [selfieMediaId, setSelfieMediaId] = useState<string>();
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorRelationship, setGuarantorRelationship] = useState<Relationship>('FAMILY');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>();
  const [attempt, setAttempt] = useState<VerificationAttempt>();
  const [feeOrder, setFeeOrder] = useState<BillingOrder>();
  const [feeError, setFeeError] = useState<unknown>();
  const [feeBusy, setFeeBusy] = useState(false);
  /** One key per fee purchase, so a retry never creates a second order. */
  const feeKey = useRef<string | null>(null);
  const [now, setNow] = useState<number>();

  const overview = useQuery({
    queryKey: queryKeys.runner.verification(),
    queryFn: verificationApi.overview,
  });

  const attemptId = attempt?.id ?? overview.data?.latestAttempt?.id;
  const polledAttempt = useQuery({
    queryKey: queryKeys.runner.verificationAttempt(attemptId ?? ''),
    queryFn: () => verificationApi.attempt(attemptId!),
    enabled: Boolean(attemptId && isPending(attempt ?? overview.data?.latestAttempt)),
    refetchInterval: (query) => isPending(query.state.data) ? 4_000 : false,
  });

  const currentAttempt = polledAttempt.data ?? attempt ?? overview.data?.latestAttempt;
  const dateOfBirthMax = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date.toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    if (feeOrder?.status !== 'PENDING') return;
    const interval = window.setInterval(() => {
      void verificationApi.getOrder(feeOrder.id).then((order) => {
        setFeeOrder(order);
        if (order.status === 'PAID') {
          void queryClient.invalidateQueries({ queryKey: queryKeys.runner.verification() });
        }
      }).catch((error: unknown) => setFeeError(error));
    }, 4_000);
    return () => window.clearInterval(interval);
  }, [feeOrder, queryClient]);

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    updateNow();
    const interval = window.setInterval(updateNow, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const updateIdentity = (field: keyof Identity, value: string) =>
    setIdentity((current) => ({ ...current, [field]: value }));

  const startVerification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{11}$/.test(idNumber) || !selfieMediaId || !confirmed || submitting) return;
    const trimmedGuarantorName = guarantorName.trim();
    const trimmedGuarantorPhone = guarantorPhone.trim();
    if ((trimmedGuarantorName && !trimmedGuarantorPhone) || (!trimmedGuarantorName && trimmedGuarantorPhone)) {
      setSubmitError(new Error('Complete both guarantor fields or leave both blank.'));
      return;
    }

    setSubmitting(true);
    setSubmitError(undefined);
    const input: components['schemas']['StartVerificationDto'] = {
      identity,
      ...(idType === 'BVN' ? { bvn: idNumber } : { nin: idNumber }),
      selfieMediaId,
      ...(documentMediaId ? { idDocument: { type: documentType, mediaId: documentMediaId } } : {}),
      ...(trimmedGuarantorName && trimmedGuarantorPhone
        ? {
            guarantor: {
              fullName: trimmedGuarantorName,
              relationship: guarantorRelationship,
              phone: trimmedGuarantorPhone,
            },
          }
        : {}),
    };
    try {
      const result = await verificationApi.start(input, crypto.randomUUID());
      setAttempt(result);
      queryClient.setQueryData(queryKeys.runner.verificationAttempt(result.id), result);
      await queryClient.invalidateQueries({ queryKey: queryKeys.runner.verification() });
      setStep(1);
    } catch (error) {
      setSubmitError(error);
      if (isApiError(error) && error.code === 'VERIFICATION_FEE_REQUIRED') {
        await queryClient.invalidateQueries({ queryKey: queryKeys.runner.verification() });
      } else if (isApiError(error) && error.code === 'VERIFICATION_PENDING') {
        await queryClient.invalidateQueries({ queryKey: queryKeys.runner.verification() });
      }
    } finally {
      setIdNumber('');
      setSubmitting(false);
    }
  };

  const startFeePayment = async () => {
    if (feeBusy) return;
    setFeeBusy(true);
    setFeeError(undefined);
    try {
      feeKey.current ??= crypto.randomUUID();
      const order = await verificationApi.createFeeOrder(feeKey.current);
      setFeeOrder(order);
      if (order.status === 'PAID') {
        await queryClient.invalidateQueries({ queryKey: queryKeys.runner.verification() });
        return;
      }
      const url = order.payment?.authorizationUrl;
      if (url) {
        const paymentUrl = new URL(url);
        if (paymentUrl.protocol !== 'https:') throw new Error('The payment provider returned an unsafe URL.');
        rememberPendingOrder(order.id);
        window.location.assign(paymentUrl.href);
      }
    } catch (error) {
      setFeeError(error);
    } finally {
      setFeeBusy(false);
    }
  };

  const verifyFeePayment = async () => {
    if (!feeOrder || feeBusy) return;
    setFeeBusy(true);
    setFeeError(undefined);
    try {
      const order = await verificationApi.verifyOrder(feeOrder.id);
      setFeeOrder(order);
      if (order.status === 'PAID') {
        await queryClient.invalidateQueries({ queryKey: queryKeys.runner.verification() });
      }
    } catch (error) {
      setFeeError(error);
    } finally {
      setFeeBusy(false);
    }
  };

  if (overview.isPending) {
    return (
      <main className="grid min-w-0 content-start gap-4 pb-10" aria-busy="true">
        <PageHead
          eyebrow="Runner"
          title="Verify your identity"
          description="One short check builds trust and unlocks offers. Your identity details are only shared with the verification team."
        />
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section aria-label="Loading identity verification" className="grid gap-4 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
            <div className="grid grid-cols-5 gap-2">{[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-8" />)}</div>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-11 w-full rounded-[var(--r-sm)]" />
            <Skeleton className="h-11 w-full rounded-[var(--r-sm)]" />
            <Skeleton className="h-11 w-36 justify-self-end rounded-full" />
          </section>
          <section aria-label="Loading verification information" className="grid content-start gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
            <Skeleton className="h-5 w-36" />
            {[0, 1, 2].map((item) => <Skeleton key={item} className="h-4 w-full" />)}
            <Skeleton className="h-3 w-32" />
          </section>
        </div>
      </main>
    );
  }
  if (overview.error || !overview.data) {
    return (
      <main className="grid min-w-0 content-start gap-4 pb-10">
        <PageHead eyebrow="Runner" title="Verify your identity" />
        <ErrorNotice error={overview.error} onRetry={() => void overview.refetch()} />
      </main>
    );
  }

  const data = overview.data;
  const retryOverview = () => void overview.refetch();
  if (data.verified || currentAttempt?.displayStatus === 'VERIFIED') {
    return (
      <main className="grid min-w-0 content-start gap-4 pb-10">
        <StatusCard title="You’re verified">
          <p>Your runner identity check is complete. You can now send offers.</p>
          {data.expiresAt && <p className="mt-2">Verified until {dateLabel(data.expiresAt)} (Lagos time).</p>}
        </StatusCard>
      </main>
    );
  }

  if (!data.phoneVerified || !me.phoneVerified) {
    return (
      <main className="grid min-w-0 content-start gap-4 pb-10">
        <StatusCard title="Verify your phone first">
          <p>A verified phone number is required before an identity check can begin.</p>
          <p className="mt-2">Confirm your number below. Once it’s verified, you can continue here.</p>
        </StatusCard>
        <div className="max-w-3xl"><ContactMethodsForm phoneOnly /></div>
      </main>
    );
  }

  if (isPending(currentAttempt) || data.status === 'REVIEW_REQUIRED' || data.status === 'PENDING') {
    const review = currentAttempt?.failureReason === 'MANUAL_REVIEW_REQUIRED' || data.status === 'REVIEW_REQUIRED';
    return (
      <main className="grid min-w-0 content-start gap-4 pb-10">
        <StatusCard title={review ? 'Your verification needs review' : 'Verification in progress'}>
          <p>{review ? failureCopy.MANUAL_REVIEW_REQUIRED : 'We are checking your details. This usually takes 2 to 4 hours. You can leave this page; we will keep checking for an update.'}</p>
          {currentAttempt && <p className="mt-2">Attempt {currentAttempt.attemptNumber} · started {dateLabel(currentAttempt.startedAt)} (Lagos time)</p>}
          {polledAttempt.error && <p role="alert" className="mt-2 text-red">We could not refresh the status. We will retry automatically.</p>}
        </StatusCard>
      </main>
    );
  }

  const failure = currentAttempt?.failureReason ? failureCopy[currentAttempt.failureReason] : undefined;
  const cooldown = data.nextAttemptAt && now !== undefined && new Date(data.nextAttemptAt).getTime() > now;

  return (
    <main className="grid min-w-0 content-start gap-4 pb-10">
      <PageHead
        eyebrow="Runner"
        title="Verify your identity"
        description="One short check builds trust and unlocks offers. Your identity details are only shared with the verification team."
      />

      {failure && (
        <Alert variant={currentAttempt?.failureReason === 'DUPLICATE_IDENTITY' ? 'danger' : 'warn'} role="status">
          <p>{failure}</p>
          {currentAttempt?.failureReason === 'DUPLICATE_IDENTITY' && <Link className="mt-2 inline-block font-bold underline" href="/help">Contact support</Link>}
        </Alert>
      )}
      {submitError instanceof Error && !(submitError instanceof ApiError)
        ? <Alert variant="warn" role="alert">{submitError.message}</Alert>
        : null}
      {submitError instanceof ApiError && (
        <Alert variant="danger" role="alert">
          <p>{friendlyError(submitError)}</p>
          {retryAt(submitError) && <p className="mt-1">You can try again after {dateLabel(retryAt(submitError)!)} (Lagos time).</p>}
          {submitError.requestId && <p className="mt-1 text-xs">Request ID: {submitError.requestId}</p>}
        </Alert>
      )}

      {data.feeRequired && (
        <section className="grid gap-3 rounded-[var(--r-lg)] bg-amber-bg p-4 shadow-[var(--shadow)] sm:flex sm:items-center sm:justify-between sm:p-[22px]">
          <div>
            <h2 className="font-extrabold text-ink">A verification fee is required</h2>
            <p className="mt-1 text-sm text-muted">{data.attemptsRemaining} verification {data.attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining. Payment is handled securely by our payment provider.</p>
            {feeOrder && <p className="mt-1 text-xs text-muted">Order status: {feeOrder.status.toLowerCase()}</p>}
            {feeOrder?.status === 'PAID' && <p className="mt-1 text-sm font-bold text-ok">Payment received. Refreshing your verification allowance…</p>}
            {feeOrder?.status === 'PENDING' && <Button type="button" variant="ghost" size="sm" className="mt-2" disabled={feeBusy} onClick={() => void verifyFeePayment()}>I’ve paid — check payment</Button>}
            {feeError ? <p role="alert" className="mt-2 text-sm text-red">{friendlyError(feeError)}{requestId(feeError) ? ` Request ID: ${requestId(feeError)}` : ''}</p> : null}
          </div>
          <Button type="button" disabled={feeBusy} onClick={() => void startFeePayment()}>{feeBusy ? 'Preparing payment…' : 'Pay verification fee'}</Button>
        </section>
      )}

      {cooldown && (
        <Alert variant="warn" role="status"><Clock3 aria-hidden="true" className="mr-2 inline size-4" />You can try again after {dateLabel(data.nextAttemptAt!)} (Lagos time).</Alert>
      )}

      {data.canStart && !data.feeRequired && !cooldown && (
        <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
            <ol aria-label="Verification steps" className="mb-6 grid grid-cols-5 gap-2">
              {['Identity', 'ID number', 'Selfie', 'Guarantor', 'Review'].map((label, index) => (
                <li key={label} className={`border-t-2 pt-2 text-[10px] font-bold sm:text-xs ${step === index + 1 ? 'border-lime-600 text-ink' : step > index + 1 ? 'border-green-700 text-green-800' : 'border-line text-muted'}`}>
                  {index + 1}. {label}
                </li>
              ))}
            </ol>

            {step === 1 && (
              <form className="grid gap-4" aria-labelledby="verification-identity-heading" onSubmit={(event) => { event.preventDefault(); setStep(2); }}>
                <div><h2 id="verification-identity-heading" className="text-lg font-extrabold text-ink">Who are you?</h2><p className="text-sm text-muted">Use the names exactly as they appear on your ID.</p></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-bold text-ink-2">First name<input required autoComplete="given-name" value={identity.firstName} onChange={(event) => updateIdentity('firstName', event.target.value)} className="min-h-11 rounded-[var(--r-sm)] border-0 bg-panel px-3 font-normal text-ink outline-none focus-visible:ring-2 focus-visible:ring-green-700" /></label>
                  <label className="grid gap-1.5 text-sm font-bold text-ink-2">Last name<input required autoComplete="family-name" value={identity.lastName} onChange={(event) => updateIdentity('lastName', event.target.value)} className="min-h-11 rounded-[var(--r-sm)] border-0 bg-panel px-3 font-normal text-ink outline-none focus-visible:ring-2 focus-visible:ring-green-700" /></label>
                </div>
                <label className="grid gap-1.5 text-sm font-bold text-ink-2">Home address<input required autoComplete="street-address" value={identity.addressLine} onChange={(event) => updateIdentity('addressLine', event.target.value)} className="min-h-11 rounded-[var(--r-sm)] border-0 bg-panel px-3 font-normal text-ink outline-none focus-visible:ring-2 focus-visible:ring-green-700" /></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-bold text-ink-2">Local government area<input required value={identity.lga} onChange={(event) => updateIdentity('lga', event.target.value)} className="min-h-11 rounded-[var(--r-sm)] border-0 bg-panel px-3 font-normal text-ink outline-none focus-visible:ring-2 focus-visible:ring-green-700" /></label>
                  <DateOfBirthPicker value={identity.dateOfBirth} max={dateOfBirthMax} onChange={(value) => updateIdentity('dateOfBirth', value)} />
                </div>
                <div className="flex justify-end"><Button type="submit">Continue</Button></div>
              </form>
            )}

            {step === 2 && (
              <form className="grid gap-4" aria-labelledby="verification-id-heading" onSubmit={(event) => { event.preventDefault(); setStep(3); }}>
                <div><h2 id="verification-id-heading" className="text-lg font-extrabold text-ink">Government ID</h2><p className="text-sm text-muted">The ID photo is optional and used only if a manual review is needed.</p></div>
                <label className="grid gap-1.5 text-sm font-bold text-ink-2">Document type
                  <select value={documentType} onChange={(event) => setDocumentType(event.target.value as IdDocumentType)} className="min-h-11 rounded-[var(--r-sm)] border-0 bg-panel px-3 font-normal text-ink outline-none focus-visible:ring-2 focus-visible:ring-green-700">
                    <option value="NIN_SLIP">NIN slip or card</option><option value="VOTERS_CARD">Voter’s card</option><option value="DRIVERS_LICENCE">Driver’s licence</option><option value="INTERNATIONAL_PASSPORT">International passport</option>
                  </select>
                </label>
                <fieldset className="grid gap-1.5">
                  <legend className="mb-1.5 text-sm font-bold text-ink-2">Verify with</legend>
                  <div className="flex gap-2">
                    {(['NIN', 'BVN'] as const).map((option) => (
                      <label key={option} className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-[var(--r-sm)] px-3 text-sm font-bold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-green-700 ${idType === option ? 'bg-tint-2 text-green-900' : 'bg-panel text-ink-2'}`}>
                        <input type="radio" name="id-type" value={option} checked={idType === option} onChange={() => { setIdType(option); setIdNumber(''); }} className="sr-only" />
                        {option === 'NIN' ? 'NIN' : 'BVN'}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="grid gap-1.5 text-sm font-bold text-ink-2">11-digit {idType}
                  <input required autoComplete="off" type="text" inputMode="numeric" maxLength={11} pattern="[0-9]{11}" value={idNumber} onChange={(event) => setIdNumber(event.target.value.replace(/\D/g, '').slice(0, 11))} className="min-h-11 rounded-[var(--r-sm)] border-0 bg-panel px-3 font-normal text-ink outline-none focus-visible:ring-2 focus-visible:ring-green-700" aria-describedby="id-number-privacy-note" />
                </label>
                <p id="id-number-privacy-note" className="text-xs text-muted">Your {idType} is sent once for verification. It is never saved in your account or browser storage. Your name and date of birth must match the {idType} record.</p>
                <div><p className="mb-2 text-sm font-bold text-ink-2">Optional ID photo</p><MediaUpload purpose="VERIFICATION_INPUT" maxFiles={1} value={documentMediaId ? [documentMediaId] : []} onChange={(ids) => setDocumentMediaId(ids[0])} /></div>
                <div className="flex justify-between"><Button type="button" variant="ghost" onClick={() => setStep(1)}>Back</Button><Button type="submit" disabled={!/^\d{11}$/.test(idNumber)}>Continue</Button></div>
              </form>
            )}

            {step === 3 && (
              <section className="grid gap-4" aria-labelledby="verification-selfie-heading">
                <div><h2 id="verification-selfie-heading" className="text-lg font-extrabold text-ink">Selfie check</h2><p className="text-sm text-muted">Face the camera in good light. Remove hats and sunglasses.</p></div>
                <MediaUpload purpose="VERIFICATION_INPUT" maxFiles={1} capture="user" value={selfieMediaId ? [selfieMediaId] : []} onChange={(ids) => setSelfieMediaId(ids[0])} />
                <div className="flex justify-between"><Button type="button" variant="ghost" onClick={() => setStep(2)}>Back</Button><Button type="button" disabled={!selfieMediaId} onClick={() => setStep(4)}>Continue</Button></div>
              </section>
            )}

            {step === 4 && (
              <section className="grid gap-4" aria-labelledby="verification-guarantor-heading">
                <div><h2 id="verification-guarantor-heading" className="text-lg font-extrabold text-ink">Guarantor <span className="text-sm font-medium text-muted">(optional)</span></h2><p className="text-sm text-muted">A trusted person who can vouch for you. This is only used if a safety issue needs review.</p></div>
                <label className="grid gap-1.5 text-sm font-bold text-ink-2">Full name<input autoComplete="name" value={guarantorName} onChange={(event) => setGuarantorName(event.target.value)} className="min-h-11 rounded-[var(--r-sm)] border-0 bg-panel px-3 font-normal text-ink outline-none focus-visible:ring-2 focus-visible:ring-green-700" /></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-bold text-ink-2">Relationship<select value={guarantorRelationship} onChange={(event) => setGuarantorRelationship(event.target.value as Relationship)} className="min-h-11 rounded-[var(--r-sm)] border-0 bg-panel px-3 font-normal text-ink outline-none focus-visible:ring-2 focus-visible:ring-green-700"><option value="FAMILY">Family</option><option value="FRIEND">Friend</option><option value="EMPLOYER">Employer</option><option value="NEIGHBOUR">Neighbour</option></select></label>
                  <label className="grid gap-1.5 text-sm font-bold text-ink-2">Phone number<input autoComplete="tel" inputMode="tel" value={guarantorPhone} onChange={(event) => setGuarantorPhone(event.target.value)} className="min-h-11 rounded-[var(--r-sm)] border-0 bg-panel px-3 font-normal text-ink outline-none focus-visible:ring-2 focus-visible:ring-green-700" /></label>
                </div>
                <div className="flex justify-between"><Button type="button" variant="ghost" onClick={() => setStep(3)}>Back</Button><div className="flex gap-2"><Button type="button" variant="ghost" onClick={() => setStep(5)}>Skip</Button><Button type="button" onClick={() => setStep(5)}>Continue</Button></div></div>
              </section>
            )}

            {step === 5 && (
              <form className="grid gap-4" onSubmit={(event) => void startVerification(event)}>
                <div><h2 className="text-lg font-extrabold text-ink">Review and submit</h2><p className="text-sm text-muted">Check your details before you send them for verification.</p></div>
                <dl className="grid gap-2 rounded-[var(--r-sm)] bg-panel p-4 text-sm sm:grid-cols-2">
                  <div><dt className="text-muted">Name</dt><dd className="font-bold text-ink">{identity.firstName} {identity.lastName}</dd></div>
                  <div><dt className="text-muted">Date of birth</dt><dd className="font-bold text-ink">{identity.dateOfBirth}</dd></div>
                  <div><dt className="text-muted">Address</dt><dd className="font-bold text-ink">{identity.addressLine}, {identity.lga}</dd></div>
                  <div><dt className="text-muted">Verified with</dt><dd className="font-bold text-ink">{idType}</dd></div>
                  <div><dt className="text-muted">Government ID</dt><dd className="font-bold text-ink">{documentMediaId ? documentType.replaceAll('_', ' ').toLowerCase() : 'Not provided'}</dd></div>
                </dl>
                <label className="flex items-start gap-3 text-sm leading-6 text-ink-2"><input required type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 size-4 accent-lime-700" /><span>I confirm these details are true and agree to the runner conduct rules, including the prohibited-items policy.</span></label>
                <div className="flex justify-between"><Button type="button" variant="ghost" disabled={submitting} onClick={() => setStep(4)}>Back</Button><Button type="submit" disabled={!confirmed || !selfieMediaId || submitting}>{submitting ? 'Submitting…' : 'Submit for verification'}</Button></div>
              </form>
            )}
          </div>
          <aside className="grid content-start gap-3 rounded-[var(--r-lg)] bg-surface p-4 shadow-[var(--shadow)] sm:p-[22px]">
            <h2 className="text-base font-extrabold tracking-tight text-ink">Why we verify</h2>
            <p className="flex gap-2 text-sm text-ink-2"><CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-green-800" />Requesters can trust the runner badge.</p>
            <p className="flex gap-2 text-sm text-ink-2"><CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-green-800" />Your identity is never shown to requesters.</p>
            <p className="flex gap-2 text-sm text-ink-2"><CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-green-800" />Most reviews finish in 2 to 4 hours.</p>
            <p className="text-xs text-muted">You have {data.attemptsRemaining} {data.attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining.</p>
          </aside>
        </section>
      )}

      {!data.canStart && !data.feeRequired && !cooldown && (
        <StatusCard title="Verification is not available yet">
          <p>Your account is not currently eligible to start a verification attempt. Check your account standing or contact support.</p>
        </StatusCard>
      )}
      {polledAttempt.error && !isPending(currentAttempt) && (
        <ErrorNotice error={polledAttempt.error} onRetry={() => void polledAttempt.refetch()} />
      )}
      <Button type="button" variant="ghost" className="w-fit" onClick={retryOverview}>Refresh verification status</Button>
    </main>
  );
}
