export const SEOTECH_API_URL_PROD = 'https://14257-seotech.adobeioruntime.net';
export const SEOTECH_API_URL_STAGE = 'https://14257-seotech-stage.adobeioruntime.net';

export function logError(msg) {
  window.lana.log(`SEOTECH: ${msg}`, {
    debug: false,
    implicitSampleRate: 100,
    sampleRate: 100,
    tags: 'errorType=seotech',
  });
}

export async function getVideoObject(url, seotechAPIUrl) {
  if (!url) throw new Error('URL undefined');
  const videosUrl = `${seotechAPIUrl}/api/v1/web/seotech/getVideoObject?url=${url}`;
  const resp = await fetch(videosUrl, { headers: { 'Content-Type': 'application/json' } });
  const body = await resp?.json();
  if (!resp.ok) {
    throw new Error(body?.error);
  }
  return body.videoObject;
}

export default async function appendVideoObjectScriptTag(url, { createTag, getConfig }) {
  const seotechAPIUrl = getConfig()?.env?.name === 'prod'
    ? SEOTECH_API_URL_PROD : SEOTECH_API_URL_STAGE;
  try {
    const obj = await getVideoObject(url, seotechAPIUrl);
    const script = createTag('script', { type: 'application/ld+json' }, JSON.stringify(obj));
    document.head.append(script);
  } catch (e) {
    logError(e.message);
  }
}
