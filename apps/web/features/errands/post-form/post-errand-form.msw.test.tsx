import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Me } from '@/lib/api/types';
import { SessionProvider } from '@/lib/auth/client';
import { listen, server } from '@/test/msw/server';
import type { Errand } from '../api';
import { PostErrandForm } from './post-errand-form';

vi.mock('@/lib/google-maps', () => ({
  loadGoogleMaps: () => Promise.reject(new Error('Google Maps is not configured.')),
}));

const me: Me = {
  id: 'requester-1',
  name: 'Ada Lovelace',
  firstName: 'Ada',
  lastName: 'Lovelace',
  phone: '+2348031234567',
  phoneVerified: true,
  email: null,
  emailVerified: false,
  hasPassword: true,
  googleLinked: false,
  status: 'ACTIVE',
  startMode: 'REQUESTER',
  photoMediaId: null,
  bio: null,
  homeArea: null,
  deletionScheduledAt: null,
  createdAt: '2025-03-10T00:00:00.000Z',
};

const category = {
  id: 'a7f7d3de-27a1-4a23-a67b-6e69c03ce541',
  key: 'car_wash',
  name: 'Car wash',
  requiresPickup: false,
  requiresDestination: true,
  flow: 'SERVICE' as const,
  isPopular: true,
};

const delivery = {
  id: 'b2c1d4e5-27a1-4a23-a67b-6e69c03ce542',
  key: 'delivery',
  name: 'Delivery',
  requiresPickup: true,
  requiresDestination: true,
  flow: 'TRANSIT' as const,
  isPopular: true,
};

const draft: Errand = {
  id: 'errand-1',
  version: 1,
  status: 'DRAFT',
  category: { id: category.id, key: category.key, name: category.name, flow: category.flow },
  priority: 'STANDARD',
  title: 'Collect a parcel',
  description: 'Collect the parcel from the front desk.',
  instructions: null,
  timeMode: 'ASAP',
  scheduledAt: null,
  suggestedBudgetMinor: null,
  itemSize: null,
  itemValueMinor: null,
  pickup: null,
  destination: null,
  pickupContact: null,
  dropoffContact: null,
  photos: [],
  assignment: null,
  publishedAt: null,
  expiresAt: null,
  autoCompleteAt: null,
  cancelledAt: null,
  cancellationReason: null,
  offerCount: 0,
  extended: false,
  createdAt: '2026-10-13T10:00:00.000Z',
  updatedAt: '2026-10-13T10:00:00.000Z',
};

const openErrand: Errand = {
  ...draft,
  status: 'OPEN',
  publishedAt: '2026-10-14T10:00:00.000Z',
  expiresAt: '2026-10-15T10:00:00.000Z',
};

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-errand-form' });

function renderForm(errandId?: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider me={me}>
        <PostErrandForm errandId={errandId} />
      </SessionProvider>
    </QueryClientProvider>,
  );
}

beforeAll(() => listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

/** The category picker is a custom dropdown: open it from the keyboard, focus the option, press Enter. */
async function chooseCategory(user: ReturnType<typeof userEvent.setup>, name: string) {
  screen.getByRole('combobox', { name: 'Category' }).focus();
  await user.keyboard('{Enter}');
  const option = await screen.findByRole('option', { name });
  option.focus();
  await user.keyboard('{Enter}');
}

describe('post errand form', () => {
  it('reloads an existing draft from the API and autosaves changed fields with the expected version', async () => {
    const user = userEvent.setup();
    const patches: unknown[] = [];
    server.use(
      http.get('*/api/v1/reference/categories', () => envelope([category])),
      http.get(`*/api/v1/errands/${draft.id}`, () => envelope(draft)),
      http.get('*/api/v1/me/consents', () => envelope({ consents: [] })),
      http.patch(`*/api/v1/errands/${draft.id}`, async ({ request }) => {
        patches.push(await request.json());
        return envelope({ ...draft, description: 'Pick it up at noon.', version: 2 });
      }),
    );

    renderForm(draft.id);
    expect(await screen.findByDisplayValue('Collect a parcel')).toBeInTheDocument();
    expect(await screen.findByText('Service address')).toBeInTheDocument();
    expect(screen.queryByText('Pickup location')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Item size/)).not.toBeInTheDocument();
    const description = await screen.findByLabelText('Describe the task');
    expect(description).toHaveValue('Collect the parcel from the front desk.');

    await user.clear(description);
    await user.type(description, 'Pick it up at noon.');

    await waitFor(() => expect(patches).toHaveLength(1), { timeout: 3000 });
    expect(patches[0]).toMatchObject({
      description: 'Pick it up at noon.',
      expectedVersion: 1,
    });
    expect(await screen.findByText('Draft saved')).toBeInTheDocument();
  });

  it('creates a draft with the selected category UUID before continuing to details', async () => {
    const user = userEvent.setup();
    let createBody: unknown;
    server.use(
      http.get('*/api/v1/reference/categories', () => envelope([category])),
      http.post('*/api/v1/errands', async ({ request }) => {
        createBody = await request.json();
        return envelope(draft);
      }),
    );

    renderForm();
    await user.type(await screen.findByLabelText('What do you need done?'), 'Collect a parcel');
    await chooseCategory(user, 'Car wash');
    await user.click(screen.getByRole('button', { name: 'Continue to details' }));

    await waitFor(() => expect(createBody).toEqual({
      title: 'Collect a parcel',
      categoryId: category.id,
    }));
  });

  it('groups categories into errands and services, and shows a delivery its pickup, drop-off and item fields', async () => {
    const user = userEvent.setup();
    const deliveryDraft: Errand = { ...draft, category: { id: delivery.id, key: delivery.key, name: delivery.name, flow: 'TRANSIT' } };
    server.use(
      http.get('*/api/v1/reference/categories', () => envelope([category, delivery])),
      http.get(`*/api/v1/errands/${draft.id}`, () => envelope(deliveryDraft)),
      http.get('*/api/v1/me/consents', () => envelope({ consents: [] })),
      http.patch(`*/api/v1/errands/${draft.id}`, () => envelope({ ...draft, version: 2 })),
    );

    renderForm(draft.id);
    await screen.findByDisplayValue('Collect a parcel');
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveTextContent('Delivery');
    expect(await screen.findByText('Pickup location')).toBeInTheDocument();
    expect(screen.getByText('Drop-off location')).toBeInTheDocument();
    expect(screen.getByLabelText(/Item size/)).toBeInTheDocument();
    expect(screen.getByText('Pickup contact')).toBeInTheDocument();

    screen.getByRole('combobox', { name: 'Category' }).focus();
    await user.keyboard('{Enter}');
    expect(within(await screen.findByRole('group', { name: 'Run an errand' })).getByRole('option', { name: 'Delivery' })).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Book a service' })).getByRole('option', { name: 'Car wash' })).toBeInTheDocument();
    screen.getByRole('option', { name: 'Car wash' }).focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByText('Service address')).toBeInTheDocument();
    expect(screen.queryByText('Pickup location')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Item size/)).not.toBeInTheDocument();
    expect(screen.getByText('Contact at the address')).toBeInTheDocument();
    expect(screen.queryByText('Pickup contact')).not.toBeInTheDocument();
  });

  it('warns that material edits to an open errand require offer reconfirmation', async () => {
    const user = userEvent.setup();
    let patchBody: unknown;
    const transitErrand: Errand = { ...openErrand, category: { id: delivery.id, key: delivery.key, name: delivery.name, flow: 'TRANSIT' } };
    server.use(
      http.get('*/api/v1/reference/categories', () => envelope([delivery])),
      http.get(`*/api/v1/errands/${openErrand.id}`, () => envelope(transitErrand)),
      http.get('*/api/v1/me/consents', () => envelope({ consents: [] })),
      http.patch(`*/api/v1/errands/${openErrand.id}`, async ({ request }) => {
        patchBody = await request.json();
        return envelope({ ...transitErrand, itemSize: 'SMALL', version: 2 });
      }),
    );

    renderForm(openErrand.id);
    await screen.findByDisplayValue('Collect a parcel');
    await user.selectOptions(screen.getByLabelText(/Item size/), 'SMALL');

    expect(screen.getByText(/asks existing runners to reconfirm their offers/)).toBeInTheDocument();
    await waitFor(() => expect(patchBody).toMatchObject({ itemSize: 'SMALL', expectedVersion: 1 }), { timeout: 3000 });
  });

  it('refuses to render editing controls after a runner has been selected', async () => {
    const selectedErrand: Errand = {
      ...openErrand,
      status: 'RUNNER_SELECTED',
      assignment: {
        id: 'assignment-1',
        runnerId: 'runner-1',
        status: 'PENDING_ACCEPTANCE',
        agreedAmountMinor: 400000,
        acceptedAt: null,
      },
    };
    server.use(
      http.get('*/api/v1/reference/categories', () => envelope([category])),
      http.get(`*/api/v1/errands/${selectedErrand.id}`, () => envelope(selectedErrand)),
    );

    renderForm(selectedErrand.id);

    expect(await screen.findByRole('status')).toHaveTextContent('can no longer be edited');
    expect(screen.queryByLabelText('Describe the task')).not.toBeInTheDocument();
  });
});
