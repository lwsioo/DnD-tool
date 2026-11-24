import { Navigate, type RouteObject } from 'react-router';
import { CharacterRoute } from '@/features/character/CharacterRoute';
import { WelcomePage } from '@/features/onboarding/WelcomePage';
import { SheetPage } from '@/features/sheet/SheetPage';
import { IndexRedirect } from './IndexRedirect';
import { AppShell } from './layout/AppShell';
import { NotFoundPage } from './NotFoundPage';

/**
 * Albero delle rotte (hash routing: funziona anche come PWA/file statico).
 * Scheda e benvenuto sono nel bundle principale; le altre pagine si caricano alla prima visita
 * (in modalità offline sono comunque già in cache grazie al service worker).
 * Esportato separatamente dal router per poterlo montare nei test con createMemoryRouter.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <IndexRedirect /> },
      { path: 'benvenuto', element: <WelcomePage /> },
      {
        path: 'nuovo',
        lazy: async () => ({
          Component: (await import('@/features/onboarding/wizard/WizardPage')).WizardPage,
        }),
      },
      {
        path: 'pg/:charId',
        element: <CharacterRoute />,
        children: [
          { index: true, element: <Navigate to="scheda" replace /> },
          { path: 'scheda', element: <SheetPage /> },
          {
            path: 'grimorio',
            lazy: async () => ({
              Component: (await import('@/features/grimoire/GrimoirePage')).GrimoirePage,
            }),
          },
          {
            path: 'inventario',
            lazy: async () => ({
              Component: (await import('@/features/inventory/InventoryPage')).InventoryPage,
            }),
          },
        ],
      },
      {
        path: 'campagna/:campaignId?/:category?/:entryId?',
        lazy: async () => ({ Component: (await import('@/features/wiki/WikiPage')).WikiPage }),
      },
      {
        path: 'compendio',
        lazy: async () => ({
          Component: (await import('@/features/compendium/CompendiumPage')).CompendiumPage,
        }),
      },
      {
        path: 'impostazioni',
        lazy: async () => ({ Component: (await import('@/features/settings/SettingsPage')).SettingsPage }),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
