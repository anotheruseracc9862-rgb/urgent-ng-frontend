import type { Metadata } from 'next';
import { MessagesWorkspace } from '@/features/messaging/messages-workspace';

export const metadata: Metadata = { title: 'Messages — Urgent.ng' };

export default function MessagesRoute() {
  return <MessagesWorkspace />;
}
