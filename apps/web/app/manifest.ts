import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Urgent.ng',
    short_name: 'Urgent.ng',
    description: 'Connect with people nearby for errands.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#a6d445',
    icons: [
      { src: '/assets/mascot-sprint.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
