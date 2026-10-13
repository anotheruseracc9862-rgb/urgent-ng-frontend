// Query key factories for type-safe and consistent cache keys

export const queryKeys = {
  // Auth
  auth: {
    session: () => ['auth', 'session'] as const,
    me: (userId?: string) => (userId ? ['auth', 'me', userId] as const : ['auth', 'me'] as const),
  },

  // Errands
  errands: {
    all: () => ['errands'] as const,
    lists: () => ['errands', 'list'] as const,
    list: (filters: Record<string, unknown>) => ['errands', 'list', filters] as const,
    detail: (id: string) => ['errands', 'detail', id] as const,
    offers: (errandId: string) => ['errands', 'offers', errandId] as const,
  },

  // Marketplace
  marketplace: {
    all: () => ['marketplace'] as const,
    feed: (filters: Record<string, unknown>) => ['marketplace', 'feed', filters] as const,
    detail: (id: string) => ['marketplace', 'detail', id] as const,
    saved: () => ['marketplace', 'saved'] as const,
  },

  // Offers
  offers: {
    all: () => ['offers'] as const,
    lists: () => ['offers', 'list'] as const,
    list: (filters: Record<string, unknown>) => ['offers', 'list', filters] as const,
    detail: (id: string) => ['offers', 'detail', id] as const,
  },

  // Assignments
  assignments: {
    all: () => ['assignments'] as const,
    lists: () => ['assignments', 'list'] as const,
    list: (filters: Record<string, unknown>) => ['assignments', 'list', filters] as const,
    detail: (id: string) => ['assignments', 'detail', id] as const,
  },

  // Runner
  runner: {
    all: () => ['runner'] as const,
    verification: () => ['runner', 'verification'] as const,
    performance: () => ['runner', 'performance'] as const,
    offerLimit: () => ['runner', 'offer-limit'] as const,
  },

  // Users
  users: {
    profile: (id: string) => ['users', 'profile', id] as const,
    ratings: (id: string, cursor?: string) => ['users', 'ratings', id, cursor] as const,
  },

  // Notifications
  notifications: {
    all: () => ['notifications'] as const,
    list: (cursor?: string) => ['notifications', 'list', cursor] as const,
    unreadCount: () => ['notifications', 'unread-count'] as const,
  },

  // Conversations
  conversations: {
    all: () => ['conversations'] as const,
    list: () => ['conversations', 'list'] as const,
    detail: (id: string) => ['conversations', 'detail', id] as const,
    messages: (id: string, cursor?: string) => ['conversations', 'messages', id, cursor] as const,
  },

  // Billing
  billing: {
    products: () => ['billing', 'products'] as const,
    orders: () => ['billing', 'orders'] as const,
    order: (id: string) => ['billing', 'order', id] as const,
    subscription: () => ['billing', 'subscription'] as const,
  },

  // Reference data
  reference: {
    categories: () => ['reference', 'categories'] as const,
    policies: (type: string) => ['reference', 'policies', type] as const,
  },
} as const;
