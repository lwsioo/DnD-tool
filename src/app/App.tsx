import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { ensureLinkIndex } from '@/db/linkIndexer';
import { useApplyTheme } from '@/hooks/useApplyTheme';
import { router } from './router';

export function App() {
  useApplyTheme();
  useEffect(() => {
    // Archivi creati prima dell'indice dei collegamenti: lo si costruisce una volta.
    void ensureLinkIndex();
  }, []);
  return <RouterProvider router={router} />;
}
