import { Compass } from 'lucide-react';
import { Link } from 'react-router';
import { Placeholder } from '@/ui/Placeholder';
import { m } from '@/i18n';

export function NotFoundPage() {
  return (
    <Placeholder
      icon={Compass}
      title={m.app.notFound.title}
      description={m.app.notFound.description}
    >
      <Link to="/benvenuto" className="text-sm font-medium text-accent underline-offset-4 hover:underline">
        {m.app.notFound.back}
      </Link>
    </Placeholder>
  );
}
