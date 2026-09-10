import type { Root, Text, Element, ElementContent } from "hast";
import { visit } from "unist-util-visit";

const MARKER = /\[(\d+)\]/g;

/**
 * Rehype plugin: replace `[n]` markers in rendered answer text with
 * `<cite data-marker="n">[n]</cite>` elements so the UI can turn them into
 * clickable citation chips.
 */
export function rehypeCitations() {
  return (tree: Root): void => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === null || index === undefined) return;
      if (parent.type === "element" && (parent as Element).tagName === "cite") {
        return;
      }
      if (!MARKER.test(node.value)) return;
      MARKER.lastIndex = 0;

      const replacement: ElementContent[] = [];
      let cursor = 0;
      let match: RegExpExecArray | null;

      while ((match = MARKER.exec(node.value)) !== null) {
        if (match.index > cursor) {
          replacement.push({
            type: "text",
            value: node.value.slice(cursor, match.index),
          });
        }
        replacement.push({
          type: "element",
          tagName: "cite",
          properties: { dataMarker: match[1] },
          children: [{ type: "text", value: `[${match[1]}]` }],
        });
        cursor = match.index + match[0].length;
      }
      if (cursor < node.value.length) {
        replacement.push({ type: "text", value: node.value.slice(cursor) });
      }

      parent.children.splice(index, 1, ...replacement);
      return index + replacement.length;
    });
  };
}
