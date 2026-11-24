import { WIKILINK_RE } from '@/lib/wikilinks';

/**
 * Plugin remark: trasforma `[[Destinazione]]` e `[[Destinazione|testo]]` in nodi link con url `wiki:…`,
 * che MarkdownView rende come collegamenti interni. Il testo dentro codice o link esistenti non viene toccato.
 */

interface MdNode {
  type: string;
  value?: string;
  url?: string;
  children?: MdNode[];
}

export const WIKI_SCHEME = 'wiki:';

function splitText(value: string): MdNode[] | null {
  const parts: MdNode[] = [];
  let last = 0;
  for (const m of value.matchAll(WIKILINK_RE)) {
    const target = m[1]!.trim();
    if (!target) continue;
    if (m.index! > last) parts.push({ type: 'text', value: value.slice(last, m.index) });
    parts.push({
      type: 'link',
      url: WIKI_SCHEME + encodeURIComponent(target),
      children: [{ type: 'text', value: (m[2] ?? m[1]!).trim() }],
    });
    last = m.index! + m[0].length;
  }
  if (parts.length === 0) return null;
  if (last < value.length) parts.push({ type: 'text', value: value.slice(last) });
  return parts;
}

function visit(node: MdNode) {
  if (!node.children || node.type === 'link' || node.type === 'linkReference') return;
  const next: MdNode[] = [];
  for (const child of node.children) {
    if (child.type === 'text' && child.value?.includes('[[')) {
      next.push(...(splitText(child.value) ?? [child]));
    } else {
      visit(child);
      next.push(child);
    }
  }
  node.children = next;
}

export function remarkWikilink() {
  return (tree: unknown) => visit(tree as MdNode);
}
