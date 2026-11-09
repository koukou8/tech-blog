// Markdown body links are separate from Astro component URLs.
export function stagingLinks({ base }) {
  const prefix = base.replace(/\/$/, '');
  return function transform(tree) {
    function visit(node) {
      if (node.type === 'element') {
        for (const attribute of ['href', 'src', 'poster']) {
          const value = node.properties?.[attribute];
          if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') &&
              prefix && value !== prefix && !value.startsWith(`${prefix}/`)) {
            node.properties[attribute] = `${prefix}${value}`;
          }
        }
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}
