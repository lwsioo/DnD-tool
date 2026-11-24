import { Compass } from 'lucide-react';
import { Link } from 'react-router';
import { Placeholder } from '@/ui/Placeholder';

export function NotFoundPage() {
  return (
    <Placeholder
      icon={Compass}
      title="Pagina non trovata"
      description="Questo sentiero non porta da nessuna parte."
    >
      <Link to="/benvenuto" className="text-sm font-medium text-accent underline-offset-4 hover:underline">
        Torna all'inizio
      </Link>
    </Placeholder>
  );
}
