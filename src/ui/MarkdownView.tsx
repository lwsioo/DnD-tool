import ReactMarkdown, { defaultUrlTransform, type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { parseRuleHref, RULE_HREF } from '@/features/inspector/refs';
import { remarkWikilink, WIKI_SCHEME } from '@/features/wiki/wikilink/remarkWikilink';
import { WikiLinkView } from '@/features/wiki/wikilink/WikiLinkView';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/stores/uiStore';

/** Lascia passare i link interni (regole cond:/prop:/… e wikilink wiki:) oltre a quelli web standard. */
const urlTransform = (url: string) =>
  RULE_HREF.test(url) || url.startsWith(WIKI_SCHEME) ? url : defaultUrlTransform(url);

function InternalOrExternalLink({ href, children }: { href?: string; children?: React.ReactNode }) {
  const openInspector = useUiStore((s) => s.openInspector);
  if (href?.startsWith(WIKI_SCHEME)) {
    return (
      <WikiLinkView target={decodeURIComponent(href.slice(WIKI_SCHEME.length))}>{children}</WikiLinkView>
    );
  }
  const ref = parseRuleHref(href);
  if (ref) {
    return (
      <button
        type="button"
        onClick={() => openInspector(ref)}
        className="cursor-pointer font-medium text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
      >
        {children}
      </button>
    );
  }
  if (href && RULE_HREF.test(href)) {
    // Link interno a una regola inesistente: testo semplice segnalato.
    return (
      <span className="text-danger" title="Riferimento non trovato">
        {children}
      </span>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  );
}

const components: Components = {
  a: ({ href, children }) => <InternalOrExternalLink href={href}>{children}</InternalOrExternalLink>,
};

const remarkPlugins = [remarkGfm, remarkWikilink];

interface MarkdownViewProps {
  children: string;
  className?: string;
  /** Testo più piccolo, per l'Inspector e le card. */
  compact?: boolean;
}

/** Rendering markdown (GFM) con stile coerente col tema, link alle regole e [[wikilink]]. */
export function MarkdownView({ children, className, compact }: MarkdownViewProps) {
  return (
    <div className={cn('prose max-w-none prose-codex', compact && 'prose-sm', className)}>
      <ReactMarkdown remarkPlugins={remarkPlugins} urlTransform={urlTransform} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
