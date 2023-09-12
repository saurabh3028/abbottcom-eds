/* eslint-disable import/prefer-default-export */
import { createTag } from '../../utils/utils.js';
import { getMetadata } from '../section-metadata/section-metadata.js';

const DOUBLE_WIDE = 'DoubleWideCard';

export const addBackgroundImg = (picture, cardType, card) => {
  const url = picture.querySelector('img').src;
  card.append(createTag('div', { class: `consonant-${cardType}-img`, style: `background-image: url(${url})` }));
};

const getUpFromSectionMetadata = (section) => {
  const sectionMetadata = section.querySelector('.section-metadata');
  if (!sectionMetadata) return null;
  const metadata = getMetadata(sectionMetadata);
  const styles = metadata.style?.text.split(', ').map((style) => style.replaceAll(' ', '-'));
  return styles?.find((style) => style.includes('-up'));
};

export const addFooter = (links, container, merch) => {
  const linksArr = Array.from(links);
  const linksLeng = linksArr.length;
  const hrTag = merch ? '<hr>' : '';
  let footer = `<div class="consonant-CardFooter">${hrTag}<div class="consonant-CardFooter-row" data-cells="1">`;
  footer = linksArr.reduce(
    (combined, link, index) => (
      `${combined}<div class="consonant-CardFooter-cell consonant-CardFooter-cell--${(linksLeng === 2 && index === 0) ? 'left' : 'right'}">${link.outerHTML}</div>`),
    footer,
  );
  footer += '</div></div>';

  container.insertAdjacentHTML('beforeend', footer);
  links.forEach((link) => {
    const { parentElement } = link;
    if (parentElement && document.body.contains(parentElement)) parentElement.remove();
  });
};

export const addWrapper = (el, cardType) => {
  const fragment = el.closest('.fragment');
  if (fragment) {
    const fragmentSection = el.closest('.section');
    fragmentSection?.replaceWith(el);
    fragment.classList.add('fragment-flex');
  }
  const section = el.closest('.section');
  section.classList.add('milo-card-section');
  const gridCl = 'consonant-CardsGrid';
  const prevGrid = el.closest(`.consonant-Wrapper .${gridCl}`);
  if (prevGrid) return;
  const card = el.classList[0];
  let upClass = getUpFromSectionMetadata(section);
  // Authored w/ a typed out number reference... 'two-up' vs. '2-up'
  const list = ['two-up', 'three-up', 'four-up', 'five-up'];
  const idx = list.findIndex((i) => i.includes(upClass));
  if (idx > -1) {
    upClass = `${idx + 2}-up`;
    section.classList.remove(list[idx]);
  }
  const up = upClass?.replace('-', '') || '3up';
  const gridClass = `${gridCl} ${gridCl}--${up} ${gridCl}--with4xGutter${cardType === DOUBLE_WIDE ? ` ${gridCl}--doubleWideCards` : ''}`;
  const grid = createTag('div', { class: gridClass });
  const collection = createTag('div', { class: 'consonant-Wrapper-collection' }, grid);
  const inner = createTag('div', { class: 'consonant-Wrapper-inner' }, collection);
  const wrapper = createTag('div', { class: 'milo-card-wrapper consonant-Wrapper consonant-Wrapper--1200MaxWidth' }, inner);
  section.querySelectorAll('div > .fragment').forEach((child) => {
    child.parentElement.replaceWith(child);
  });
  const cards = [...section.children].filter((child) => child.classList.contains(card) || child.classList.contains('fragment'));
  const prevSib = cards[0].previousElementSibling;

  grid.append(...cards);

  if (prevSib) {
    prevSib.after(wrapper);
  } else {
    section.prepend(wrapper);
  }
};
