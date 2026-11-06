import assert from 'node:assert/strict';
import test from 'node:test';
import { stagingLinks } from './staging-links.mjs';

test('Markdown local images and links use the Pages base exactly once', () => {
  const tree = { children: [
    { type: 'element', properties: { href: '/articles/example#heading' } },
    { type: 'element', properties: { src: '/images/スクリーンショット.png' } },
    { type: 'element', properties: { href: '/tech-blog/tags/all' } },
    { type: 'element', properties: { href: 'https://example.com' } },
    { type: 'element', properties: { src: '//example.com/image.png' } },
    { type: 'element', properties: { href: '#heading' } },
  ] };
  const transform = stagingLinks({ base: '/tech-blog/' });
  transform(tree);
  assert.deepEqual(tree.children.map(n => n.properties), [
    { href: '/tech-blog/articles/example#heading' },
    { src: '/tech-blog/images/スクリーンショット.png' },
    { href: '/tech-blog/tags/all' },
    { href: 'https://example.com' },
    { src: '//example.com/image.png' },
    { href: '#heading' },
  ]);
  const once = structuredClone(tree);
  transform(tree);
  assert.deepEqual(tree, once);
});

test('root production base leaves links unchanged', () => {
  const tree = { type: 'element', properties: { src: '/images/example.png' } };
  stagingLinks({ base: '/' })(tree);
  assert.equal(tree.properties.src, '/images/example.png');
});
