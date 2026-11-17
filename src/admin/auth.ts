import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { AdminError, type AdminEnv } from './types';

const keys = new Map<string, JWTVerifyGetKey>();
export const privateHeaders = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
};

export async function authorize(
  request: Request,
  env: AdminEnv,
  options: { localDevelopment?: boolean; keySet?: JWTVerifyGetKey } = {},
) {
  const url = new URL(request.url);
  if (
    options.localDevelopment &&
    env.ADMIN_DEV_AUTH === 'true' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  ) {
    return { email: 'local@localhost', local: true };
  }
  const issuer = env.ADMIN_ACCESS_ISSUER?.replace(/\/$/, '');
  if (
    !issuer ||
    !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer) ||
    !env.ADMIN_ACCESS_AUD ||
    !env.ADMIN_OWNER_EMAIL
  ) {
    throw new AdminError(503, '管理画面の認証設定が完了していません。');
  }
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) throw new AdminError(401, 'ログインが必要です。');
  try {
    let keySet = options.keySet || keys.get(issuer);
    if (!keySet) {
      keySet = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
      keys.set(issuer, keySet);
    }
    const { payload } = await jwtVerify(token, keySet, {
      issuer,
      audience: env.ADMIN_ACCESS_AUD,
      algorithms: ['RS256'],
      requiredClaims: ['exp', 'iat', 'email'],
    });
    if (
      typeof payload.email !== 'string' ||
      payload.email.toLowerCase() !== env.ADMIN_OWNER_EMAIL.trim().toLowerCase()
    ) {
      throw new AdminError(403, 'このアカウントでは利用できません。');
    }
    return { email: payload.email, local: false };
  } catch (error) {
    if (error instanceof AdminError) throw error;
    throw new AdminError(
      401,
      'ログインの有効期限が切れたか、認証を確認できませんでした。',
    );
  }
}

export function requireSameOrigin(request: Request) {
  if (
    request.headers.get('Origin') !== new URL(request.url).origin ||
    request.headers.get('X-Requested-With') !== 'IdeaAdmin'
  ) {
    throw new AdminError(403, 'この画面から操作をやり直してください。');
  }
  if (
    request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !==
    'application/json'
  ) {
    throw new AdminError(415, '送信形式が正しくありません。');
  }
}
