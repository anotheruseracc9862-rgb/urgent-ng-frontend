import { notFound } from 'next/navigation';
import SettingsPage from '@/app/(business)/settings/page';
import { SettingsPreviewShell } from './shell';

export default function SettingsPreview() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <SettingsPreviewShell><SettingsPage /></SettingsPreviewShell>;
}
