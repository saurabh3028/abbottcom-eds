import { html, signal, useEffect } from '../../../deps/htm-preact.js';

const DEF_ICON = 'purple';
const DEF_DESC = 'Checking...';
const pass = 'green';
const fail = 'red';

const content = signal({});
const altResult = signal({ icon: DEF_ICON, title: 'Image alt value', description: DEF_DESC });

async function checkAlt() {
  const main = document.querySelector('main');
  const images = main.querySelectorAll('img');
  const result = { ...altResult.value };
  const imagesWithoutAlt = [];
  images.forEach((img) => {
    const alt = img.getAttribute('alt');
    if (!alt || alt.trim() === '') {
      imagesWithoutAlt.push(img.getAttribute('src'));
    }
  });
  if (!imagesWithoutAlt.length) {
    result.icon = pass;
    result.description = 'Reason: All Image are valid';
  } else {
    result.icon = fail;
    result.description = 'Reason: Alt attribute or values are missing for below images on the page';
  }
  content.value = imagesWithoutAlt;
  altResult.value = result;
  return result.icon;
}

function AccessibilityItem({ icon, title, description }) {
  return html`
    <div class="accessibility-item">
      <div class="result-icon ${icon}"></div>
      <div class=seo-item-text>
        <p class=seo-item-title>${title}</p>
        <p class=seo-item-description>${description}</p>
      </div>
    </div>`;
}

export default function Accessibility() {
  useEffect(() => { checkAlt(); }, []);

  return html`
  <div class="access-columns">
    <${AccessibilityItem} icon=${altResult.value.icon} title=${altResult.value.title} description=${altResult.value.description} />
    ${content.value.length > 0 && html`
    <p class="access-image-header">Images</p>
    <div class="access-image-grid">
      ${Object.keys(content.value).map((key) => html`<div class="access-image-grid-item">
        <img src="${content.value[key]}"></img></div>`)}
    </div>
    `}
  </div>`;
}
