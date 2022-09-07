import { getConfig, setConfig, createTag, getMetadata, loadHeader, loadFooter } from '../utils/utils.js';

const locales = {
  '': { ietf: 'en-US', tk: 'hah7vzn.css' },
  de: { ietf: 'de-DE', tk: 'hah7vzn.css' },
  cn: { ietf: 'zh-CN', tk: 'tav4wnu' },
  kr: { ietf: 'ko-KR', tk: 'zfo3ouc' },
};
const config = {
  imsClientId: 'milo',
  codeRoot: '/libs',
  locales,
};

export default async function load404() {
  setConfig(config);
  const { locale } = getConfig();
  const resp = await fetch(`${locale.contentRoot}/404.plain.html`);
  if (resp.ok) {
    const html = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const main = document.querySelector('main');
    const section = createTag('div', { class: 'section' });
    const content = createTag('div', { class: 'content' });
    const titles = createTag('div', { class: 'titles' });
    const tryLinks = createTag('div', { class: 'try-links' });
    content.append(titles, tryLinks);
    section.append(content);

    // background
    const background = doc.querySelector('picture');
    section.style.backgroundImage = `url(${background.querySelector('img').src})`;
    background.parentElement.remove();

    //
    const contents = doc.body.querySelectorAll(':scope > div');
    titles.append(contents[0]);
    tryLinks.innerHTML = doc.body.innerHTML;
    main.append(section);
  }
}

(async function init() {
  load404();
  loadHeader();
  loadFooter();
  const { default: loadFavIcon } = await import('../utils/favicon.js');
  loadFavIcon(createTag, getConfig(), getMetadata);
}());
