import { decorateBlockBg, decorateBlockHrs, decorateBlockText, decorateTextOverrides, decorateButtons } from '../../utils/decorate.js';
import { createTag } from '../../utils/utils.js';

const contentTypes = ['list', 'qrcode', 'lockup', 'text', 'bgcolor', 'supplemental'];
const rowTypeKeyword = 'con-block-row-';

function decorateList(el) {
  el.classList.add('body-l', 'align-left');
  const listItems = el.querySelectorAll('ul li', 'ol li');
  if (listItems.length) {
    const firstDiv = el.querySelector(':scope > div');
    firstDiv.classList.add('foreground');
    [...listItems].forEach((item) => {
      const firstElemIsIcon = item.children[0]?.classList.contains('icon');
      if (firstElemIsIcon) item.classList.add('icon-item');
      if (!item.parentElement.classList.contains('icon-list')) item.parentElement.classList.add('icon-list');
    });
  }
}

function decorateQr(el) {
  const text = el.querySelector(':scope > div');
  /* c8 ignore next */
  if (!text) return;
  const classes = ['qr-code-img', 'google-play', 'app-store'];
  [...text.children].forEach((e, i) => {
    e.classList.add(classes[i]);
  });
}

function decorateLockupFromContent(el) {
  const rows = el.querySelectorAll(':scope > p');
  const firstRowImg = rows[0]?.querySelector('img');
  if (firstRowImg) rows[0].classList.add('lockup-area');
}

function decorateBg(el) {
  const block = el.closest('.hero-marquee');
  block.style.background = el.textContent.trim();
  el.remove();
}

function distillClasses(el, classes) {
  const taps = ['-heading', '-body', '-detail'];
  classes.forEach((elClass) => {
    const elTaps = taps.filter((tap) => elClass.endsWith(tap));
    if (!elTaps.length) return;
    const parts = elClass.split('-');
    el.classList.add(`${parts[1]}-${parts[0]}`);
    el.classList.remove(elClass);
  });
}

function decorateText(el, classes) {
  const btnClass = [...classes].filter((c) => c.endsWith('-button'));
  if (btnClass.length) {
    const parts = btnClass[0].split('-');
    el.classList.remove(btnClass[0]);
    decorateButtons(el, `${parts[1]}-${parts[0]}`);
  } else {
    decorateButtons(el, 'button-xl');
  }
  distillClasses(el, classes);
  el.classList.add('norm');
}

function decorateLockupRow(el) {
  const child = el.querySelector(':scope > div');
  if (child) child.classList.add('lockup-area');
}

function decorateSup(el, classes) {
  distillClasses(el, classes);
  el.classList.add('norm');
}

function removeBodyClassOnEl(el) {
  const actionArea = el.querySelector('.action-area');
  const bodyClass = actionArea.classList.contains('body-m');
  // const actionAreaStarts = el.querySelector('.action-area');
  console.log('actionArea bodyClass', actionArea.classList, bodyClass);
  // const hasBodyClass = [...actionArea.classList].filter((c) => {
  //   console.log('class:', c);
  //   if (!c.startsWith('body-') || !c.endsWith('-body')) return false;
  //   return c;
  // });
  // if (!hasBodyClass.length) return;
  // console.log('actionArea', el, actionArea, hasBodyClass, hasBodyClass.length);
  // el.classList.remove(hasBodyClass[0]);
}

function extendButtonsClass(copy) {
  const buttons = copy.querySelectorAll('.con-button');
  if (buttons.length === 0) return;
  buttons.forEach((button) => {
    button.classList.add('button-xl', 'button-justified-mobile');
  });
  // removeBodyClassOnEl(copy);
}
function parseKeyString(str) {
  const regex = /^(\w+)\s*\((.*)\)$/;
  const match = str.match(regex);
  if (!match) return { key: str };
  const key = match[1];
  const classes = match[2].split(',').map((c) => c.trim());
  const result = { key, classes };
  return result;
}

function loadContentType(el, key, classes) {
  if (classes !== undefined && classes.length) el.classList.add(...classes);
  if (key === 'lockup') decorateLockupRow(el);
  if (key === 'list') decorateList(el);
  if (key === 'qrcode') decorateQr(el);
  if (key === 'bgcolor') decorateBg(el);
  if (key === 'text') decorateText(el, classes);
  if (key === 'supplemental') decorateSup(el, classes);
}

export default async function init(el) {
  el.classList.add('con-block');
  let rows = el.querySelectorAll(':scope > div');
  if (rows.length > 1 && rows[0].textContent !== '') {
    el.classList.add('has-bg');
    const [head, ...tail] = rows;
    decorateBlockBg(el, head);
    rows = tail;
  }

  // get first row that's not a keyword key/value row
  const mainRowIndex = rows.findIndex((row) => {
    const firstColText = row.children[0].textContent.toLowerCase().trim();
    return !firstColText.includes(rowTypeKeyword);
  });
  const foreground = rows[mainRowIndex];
  const fRows = foreground.querySelectorAll(':scope > div');
  foreground.classList.add('foreground', `cols-${fRows.length}`);
  let copy = fRows[0];
  const anyTag = foreground.querySelector('p, h1, h2, h3, h4, h5, h6');
  const asset = foreground.querySelector('div > picture, div > video, div > a[href*=".mp4"]');

  console.log(el, 'asset', asset);
  copy = anyTag.closest('div');
  copy.classList.add('copy');

  if (asset) {
    asset.parentElement.classList.add('asset');
    foreground.classList.add('has-asset');
    if (el.classList.contains('split')) {
      el.appendChild(createTag('div', { class: 'foreground-split' }, asset));
    }
  } else {
    [...fRows].forEach((row) => {
      if (row.childElementCount === 0) {
        row.classList.add('empty-asset');
        foreground.classList.add('has-asset');
      }
    });
  }

  // if (fRows.length === 1) foreground.classList.add('fw');
  decorateBlockText(copy, ['xxl', 'm', 'l']); // heading, body, detail
  decorateLockupFromContent(copy);
  extendButtonsClass(copy);

  const assetRow = foreground.querySelector(':scope > div').classList.contains('asset');
  if (assetRow) el.classList.add('asset-left');
  const mainCopy = createTag('div', { class: 'main-copy' }, copy.innerHTML);
  rows.splice(mainRowIndex, 1);
  if (mainRowIndex > 0) {
    for (let i = 0; i < mainRowIndex; i += 1) {
      rows[i].classList.add('prepend');
    }
  }
  copy.innerHTML = '';
  copy.append(mainCopy);
  [...rows].forEach((row) => {
    if (row.classList.contains('prepend')) {
      mainCopy.before(row);
    } else {
      copy.append(row);
    }
  });

  [...rows].forEach(async (row) => {
    const cols = row.querySelectorAll(':scope > div');
    const firstCol = cols[0];
    const firstColText = firstCol.textContent.toLowerCase().trim();
    const isKeywordRow = firstColText.includes(rowTypeKeyword);
    if (isKeywordRow) {
      const keyValue = firstColText.replace(rowTypeKeyword, '').trim();
      const parsed = parseKeyString(keyValue);
      firstCol.parentElement.classList.add(`row-${parsed.key}`, 'con-block');
      firstCol.remove();
      cols[1].classList.add('row-wrapper');
      if (contentTypes.includes(parsed.key)) loadContentType(row, parsed.key, parsed.classes);
    } else {
      row.classList.add('norm');
      decorateBlockHrs(row);
      // decorateBlockText(row, ['xxl', 'm', 'l']);
      decorateButtons(row, 'button-xl');
    }
  });
  decorateTextOverrides(el, ['-heading', '-body', '-detail'], mainCopy);
}
