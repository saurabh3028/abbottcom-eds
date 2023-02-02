import { createTag, getConfig } from '../../utils/utils.js';
import { replaceKey } from '../../features/placeholders.js';

export async function getSVGsfromFile(path, selectors) {
  if (!path) return null;
  const resp = await fetch(path);
  if (!resp.ok) return null;

  const text = await resp.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'image/svg+xml');

  if (!selectors) {
    const svg = doc.querySelector('svg');
    if (svg) return [{ svg }];
    return null;
  } else if (!(selectors instanceof Array)) {
    selectors = [selectors];
  }

  return selectors.map((selector) => {
    const symbol = doc.querySelector(`#${selector}`);
    if (!symbol) return null;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    while (symbol.firstChild) svg.appendChild(symbol.firstChild);
    [...symbol.attributes].forEach((attr) => svg.attributes.setNamedItem(attr.cloneNode()));
    svg.classList.add('icon');
    svg.classList.add(`icon-${selector}`);
    svg.removeAttribute('id');
    return { svg, name: selector };
  });
}

function getPlatforms(el) {
  const manualShares = el.querySelectorAll('a');
  if (manualShares.length === 0) return null;
  return [...manualShares].map((link) => {
    const { href } = link;
    const url = new URL(href);
    const parts = url.host.split('.');
    return parts[parts.length - 2];
  });
}

export default async function decorate(el) {
  const toSentenceCase = (str) => (str && typeof str === 'string') ? str.toLowerCase().replace(/(^\s*\w|[\.\!\?]\s*\w)/g, (c) => c.toUpperCase()) : '';
  const config = getConfig();
  const base = config.miloLibs || config.codeRoot;
  const platforms = getPlatforms(el) || ['facebook', 'twitter', 'linkedin', 'pinterest'];
  let clipboardTitle;
  if (navigator.clipboard) {
    platforms.push('clipboard');
    clipboardTitle = toSentenceCase(await replaceKey('Copy to Clipboard', config));
  }
  const getDetails = (name, url) => {
    switch (name) {
      case 'facebook':
        return { title: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${url}` };
      case 'twitter':
        return { title: 'Twitter', href: `https://twitter.com/share?&url=${url}` };
      case 'linkedin':
        return { title: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}` };
      case 'pinterest':
        return { title: 'Pinterest', href: `https://pinterest.com/pin/create/button/?url=${url}` };
      case 'clipboard':
        return { title: clipboardTitle };
      default: return null;
    }
  }
  el.querySelector('div').remove();
  const url = encodeURIComponent(window.location.href);
  const svgs = await getSVGsfromFile(`${base}/blocks/share/share.svg`, platforms);
  if (!svgs) return;
  
  const heading = toSentenceCase(await replaceKey('share-this-page', config));
  el.append(createTag('p', null, ((heading))));
  const container = createTag('p', { class: 'icon-container' });
  svgs.forEach((svg) => {
    const obj = getDetails(svg.name, url);
    if (!obj) return;

    const clipboard = (obj.title === clipboardTitle);
    const tag = (clipboard) ? 'button' : 'a';
    const attrs = (clipboard) ? { type:'button', class:'copy-to-clipboard', title: `Copy to ${obj.title}` } : { target: '_blank', href: obj.href, title: `Share to ${obj.title}` }
    const shareLink = createTag(tag, attrs, svg.svg);
    shareLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (clipboard) {
        navigator.clipboard.writeText(window.location.href).then(() => {
          shareLink.classList.add('copy-to-clipboard-copied');
          setTimeout(() => document.activeElement.blur(), 500);
          setTimeout(() => shareLink.classList.remove('copy-to-clipboard-copied'), 2000);
        });
      } else {
        /* c8 ignore next 2 */
        window.open(shareLink.href, 'newwindow', 'width=600, height=400');
      }
    });
    container.append(shareLink);
  });
  el.append(container);
}
