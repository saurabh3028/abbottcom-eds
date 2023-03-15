import { createTag } from '../../utils/utils.js';

const LOC_CONFIG = 'https://main--milo--adobecom.hlx.page/drafts/localization/configs/config.json';
const HELIX_ADMIN = 'https://admin.hlx.page';

const getLivecopies = async () => {
  const livecopies = [];
  const res = await fetch(LOC_CONFIG);
  const json = await res.json();
  json.locales.data.forEach((d) => {
    livecopies.push(...d.livecopies.split(','));
  });
  return livecopies.sort();
};

const getWebPath = async (owner, repo, referrer) => {
  try {
    const res = await fetch(`${HELIX_ADMIN}/status/${owner}/${repo}/ref?editUrl=${referrer}`);
    const json = await res.json();
    return json.webPath;
  } catch (e) {
    return false;
  }
}

const getEditUrl = async (owner, repo, locale, path) => {
  try {
    const res = await fetch(`${HELIX_ADMIN}/status/${owner}/${repo}/main/${locale}/${path}?editUrl=auto`);
    const json = await res.json();
    if (json.edit.status === 200) {
      return json.edit.url;
    }
  } catch (e) { /* ignore */ }
  return false;
}

const insertAlphabetically = (ol, li) => {
  const locale = li.getAttribute('data-locale');
  const items = [...ol.getElementsByTagName('li')];
  const insertBefore = items.find((item) => locale < item.getAttribute('data-locale'));
  if (insertBefore) {
    ol.insertBefore(li, insertBefore);
  } else {
    ol.append(li);
  }
};

const decorateRegionLinks = async (block) => {
  const livecopies = await getLivecopies();
  const { search } = window.location;
  const params = new URLSearchParams(search);
  const referrer = params.get('referrer');
  const owner = params.get('owner');
  const repo = params.get('repo');
  const branch = params.get('ref');
  
  if (!owner || !repo || !referrer) return;
  
  const currentPath = await getWebPath(owner, repo, referrer);
  
  let currentPathWithOutLocale = currentPath;
  if (!currentPath) {
    return;
  }
  const currentLocale = currentPath.split('/')[1];
  const index = livecopies.indexOf(currentLocale);
  if (index > -1) {
    livecopies.splice(index, 1);
    currentPathWithOutLocale = currentPath.substring(currentPath.indexOf(currentLocale) + currentLocale.length);
  }
  
  const editUrls = new Set();
  const ol = createTag('ol', { class: 'sk-edit-links' });
  livecopies.forEach(async l => {
    const editUrl = await getEditUrl(owner, repo, l, currentPathWithOutLocale);
    if (editUrl && !editUrls.has(editUrl)) {
      const previewUrl = `${l ? `/${l}` : ''}${currentPathWithOutLocale}`;
      
      if (previewUrl === currentPath) return;

      const item = createTag('div', { class: 'sk-region-select-item' });
      const li = createTag('li', { class: 'sk-edit-list', 'data-locale': l});
      const previewLink = createTag('a', { class: 'sk-preview-link', target: '_blank' });
      const editLink = createTag('a', { class: 'sk-edit-link', target: '_blank' });
      previewLink.href = `http://${branch}--${repo}--${owner}.hlx.page${previewUrl}`;
      previewLink.innerHTML = previewUrl;
      editLink.href = editUrl;
      editLink.innerHTML = 'Edit';

      item.append(previewLink);
      item.append(editLink);
      li.append(item);
      insertAlphabetically(ol, li);
      editUrls.add(editUrl);
    }
  });
  block.querySelector('div').append(ol);
};

const init = async (block) => {
  await decorateRegionLinks(block);
}

export default init;
