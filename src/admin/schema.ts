import { z } from 'zod';
import { AdminError } from './types';

const reference = z
  .string()
  .trim()
  .max(2048)
  .pipe(z.url())
  .refine((value) => {
    const url = new URL(value);
    return (
      ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  }, '参考URLはhttpまたはhttpsのURLを入力してください。');
export const ideaSchema = z
  .object({
    title: z.string().trim().min(1).max(180),
    notes: z.string().max(50000).default(''),
    status: z.enum(['idea', 'research', 'writing', 'done']).default('idea'),
    tags: z
      .array(z.string().trim().min(1).max(40))
      .max(12)
      .default([])
      .transform((tags) => [
        ...new Map(tags.map((tag) => [tag.toLowerCase(), tag])).values(),
      ]),
    references: z
      .array(reference)
      .max(20)
      .default([])
      .transform((urls) => [...new Set(urls)]),
    revision: z
      .number()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER)
      .optional(),
  })
  .strict();
export const revisionSchema = z
  .object({
    revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  })
  .strict();

export async function readJson(request: Request) {
  const limit = 300000;
  if (Number(request.headers.get('Content-Length')) > limit)
    throw new AdminError(413, '入力内容が大きすぎます。');
  const reader = request.body?.getReader();
  if (!reader) throw new AdminError(400, '入力内容を確認してください。');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new AdminError(413, '入力内容が大きすぎます。');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder().decode(bytes);
  try {
    return JSON.parse(text);
  } catch {
    throw new AdminError(400, '入力内容を確認してください。');
  }
}
