import { 
  fetchPlaceholders,
  getLocaleIetf, 
  getRootPath 
} from '../../utils/utils.js';

/**
 * number case, coming from Excel
 * 1/1/1900 is day 1 in Excel, so:
 *  - add this
 *  - add days between 1/1/1900 and 1/1/1970
 *  - add one more day for Excel's leap year bug
 * 
 * @param {number} date The date to format
 * @returns {string} The formatted date
 */
function calculateExcelDate(date) {
  return new Date(Math.round((date - (1 + 25567 + 1)) * 86400 * 1000));
}

// Safari won't accept '-' as a date separator
function replaceSeparator(date) {
  date.replace(/-/g, '/')
}

/**
 * Format date to locale.
 * 
 * @param {number} date The date to format
 * @returns {string} The formatted card date
 */
export function formatCardLocaleDate(date) {
  let jsDate = !date.includes('-') ? calculateExcelDate(date) : replaceSeparator(date);
  const dateLocale = getLocaleIetf();

  let dateString = new Date(jsDate).toLocaleDateString(dateLocale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });

  if (dateLocale === 'en-US') {
    // stylize US date format with dashes instead of slashes
    dateString = dateString.replace(/\//g, '-');
  }
  return dateString;
}

/**
 * Returns a link tag with the proper href for the given topic.
 * If the taxonomy is not yet available, the tag is decorated with the topicLink
 * data attribute so that the link can be fixed later.
 * @param {string} topic The topic name
 * @returns {string} A link tag as a string
 */
export function getLinkForTopic(topic, path) {
  const titleSubs = {
    'Transformation digitale': 'Transformation numérique',
  };
  
  const catLink = taxonomy?.get(topic).map(tax => tax?.link ?? "#");

  if(catLink === '#') {
    console.warn(`Trying to get a link for an unknown topic: ${topic} ${path ? `on page ${path}` : '(current page)'}`);
  }

  return `<a href="${catLink ?? ''}" ${catLink ?? `data-topic-link="${topic}"`}>${titleSubs[topic] ?? topic}</a>`;
}

/**
 * Returns a picture element with webp and fallbacks
 * @param {string} src The image URL
 * @param {boolean} eager load image eager
 * @param {Array} breakpoints breakpoints and corresponding params (eg. width)
 */

export function createOptimizedPicture(src, alt = '', eager = false, breakpoints = [{ media: '(min-width: 400px)', width: '2000' }, { width: '750' }]) {
  const url = new URL(src, window.location.href);
  const picture = document.createElement('picture');
  const { pathname } = url;
  const ext = pathname.substring(pathname.lastIndexOf('.') + 1);

  // webp
  breakpoints.forEach((br) => {
    const source = document.createElement('source');
    if (br.media) source.setAttribute('media', br.media);
    source.setAttribute('type', 'image/webp');
    source.setAttribute('srcset', `${pathname}?width=${br.width}&format=webply&optimize=medium`);
    picture.appendChild(source);
  });

  // fallback
  breakpoints.forEach((br, i) => {
    if (i < breakpoints.length - 1) {
      const source = document.createElement('source');
      if (br.media) source.setAttribute('media', br.media);
      source.setAttribute('srcset', `${pathname}?width=${br.width}&format=${ext}&optimize=medium`);
      picture.appendChild(source);
    } else {
      const img = document.createElement('img');
      img.setAttribute('src', `${pathname}?width=${br.width}&format=${ext}&optimize=medium`);
      img.setAttribute('loading', eager ? 'eager' : 'lazy');
      img.setAttribute('alt', alt);
      picture.appendChild(img);
    }
  });

  return picture;
}

let taxonomy;

/**
 * For the given list of topics, returns the corresponding computed taxonomy:
 * - category: main topic
 * - topics: tags as an array
 * - visibleTopics: list of visible topics, including parents
 * - allTopics: list of all topics, including parents
 * @param {Array} topics List of topics
 * @returns {Object} Taxonomy object
 */
function computeTaxonomyFromTopics(topics, path) {
  // no topics: default to a randomly choosen category
  const category = topics?.length > 0 ? topics[0] : 'news';

  if (taxonomy) {
    const allTopics = [];
    const visibleTopics = [];
    // if taxonomy loaded, we can compute more
    topics.forEach((tag) => {
      taxonomy.get(tag).map(tax => {
        if (tax) {
          if (!tax.skipMeta) {
            allTopics.push(tag);
            if (tax.isUFT) {
              visibleTopics.push(tag);
            }
            const parents = taxonomy.getParents(tag);
            if (parents) {
              parents.forEach((parent) => {
                const ptax = taxonomy.get(parent);
                if (!allTopics.includes(parent)) {
                  allTopics.push(parent);
                  if (ptax.isUFT) visibleTopics.push(parent);
                }
              });
            }
          }
        } else {
          debug(`Unknown topic in tags list: ${tag} ${path ? `on page ${path}` : '(current page)'}`);
        }
      })
      
    });

    return {
      category, 
      topics, 
      visibleTopics, 
      allTopics
    };
  }

  return {
    category,
    topics
  };
}


/**
 * Loads (i.e. sets on object) the taxonomy properties for the given article.
 * @param {Object} article The article to enhance with the taxonomy data
 */
function loadArticleTaxonomy(article) {
  if(article.allTopics) {
    return;
  }

  // for now, we can only compute the category
  const { tags, path } = article;

  if (tags) {
    const topics = tags
      .replace(/[["\]]/gm, '')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t && t !== '');

    const articleTax = computeTaxonomyFromTopics(topics, path);

    article.category = articleTax.category;

    // topics = tags as an array
    article.topics = topics;

    // visibleTopics = visible topics including parents
    article.visibleTopics = articleTax.allVisibleTopics;

    // allTopics = all topics including parents
    article.allTopics = articleTax.allTopics;
  } else {
    article.category = 'News';
    article.topics = [];
    article.visibleTopics = [];
    article.allTopics = [];
  }
}

/**
 * Sanitizes a name for use as class name.
 * @param {*} name The unsanitized name
 * @returns {string} The class name
 */
export function toClassName(name) {
  return name && typeof name === 'string'
    ? name.toLowerCase().replace(/[^0-9a-z]/gi, '-')
    : '';
}

/**
 * Extracts the config from a block.
 * @param {Element} block The block element
 * @returns {object} The block config
 */
export function readBlockConfig(block) {
  const config = {};
  block.querySelectorAll(':scope>div').forEach((row) => {
    if (row.children) {
      const cols = [...row.children];
      if (cols[1]) {
        const valueEl = cols[1];
        const name = toClassName(cols[0].textContent);
        let value = '';
        if (valueEl.querySelector('a')) {
          const aArr = [...valueEl.querySelectorAll('a')];
          if (aArr.length === 1) {
            value = aArr[0].href;
          } else {
            value = aArr.map((a) => a.href);
          }
        } else if (valueEl.querySelector('p')) {
          const pArr = [...valueEl.querySelectorAll('p')];
          if (pArr.length === 1) {
            value = pArr[0].textContent;
          } else {
            value = pArr.map((p) => p.textContent);
          }
        } else value = row.children[1].textContent;
        config[name] = value;
      }
    }
  });

  return config;
}

export function stamp(message) {
  if (window.name.includes('performance')) {
    debug(`${new Date() - performance.timing.navigationStart}:${message}`);
  }
}

/**
 * Get the taxonomy of the given article. Object can be composed of:
 * - category: main topic
 * - topics: tags as an array
 * - visibleTopics: list of visible topics, including parents
 * - allTopics: list of all topics, including parents
 * Note: to get the full object, taxonomy must be loaded
 * @param {Object} article The article
 * @returns The taxonomy object
 */
export function getArticleTaxonomy(article) {
  if (!article.allTopics) {
    loadArticleTaxonomy(article);
  }

  const {
    category,
    topics,
    visibleTopics,
    allTopics,
  } = article;

  return {
    category, topics, visibleTopics, allTopics,
  };
}

/**
 * Build article card
 * @param {Element} article The article data to be placed in card.
 * @returns card Generated card
 */
export function buildArticleCard(article, type = 'article', eager = false) {
  const {
    title, description, image, imageAlt, date,
  } = article;

  const path = article.path.split('.')[0];

  const picture = createOptimizedPicture(image, imageAlt || title, eager, [{ width: '750' }]);
  const pictureTag = picture.outerHTML;
  const card = document.createElement('a');
  card.className = `${type}-card`;
  card.href = path;

  const articleTax = getArticleTaxonomy(article);
  const categoryTag = getLinkForTopic(articleTax.category, path);

  card.innerHTML = `<div class="${type}-card-image">
      ${pictureTag}
    </div>
    <div class="${type}-card-body">
      <p class="${type}-card-category">
        ${categoryTag}
      </p>
      <h3>${title}</h3>
      <p class="${type}-card-description">${description}</p>
      <p class="${type}-card-date">${formatCardLocaleDate(date)}
    </div>`;
  return card;
}

/**
 * fetches blog article index.
 * @returns {object} index with data and path lookup
 */
export async function fetchBlogArticleIndex() {
  const pageSize = 500;
  window.blogIndex = window.blogIndex || {
    data: [],
    byPath: {},
    offset: 0,
    complete: false,
  };
  if (window.blogIndex.complete) return (window.blogIndex);
  const index = window.blogIndex;
  const resp = await fetch(`${getRootPath()}/query-index.json?limit=${pageSize}&offset=${index.offset}`);
  const json = await resp.json();
  const complete = (json.limit + json.offset) === json.total;
  json.data.forEach((post) => {
    index.data.push(post);
    index.byPath[post.path.split('.')[0]] = post;
  });
  index.complete = complete;
  index.offset = json.offset + pageSize;
  return (index);
}

function isCardOnPage(article) {
  const path = article.path.split('.')[0];
  /* using recommended and featured articles */
  return !!document.querySelector(`.featured-article a.featured-article-card[href="${path}"], .recommended-articles a.article-card[href="${path}"]`);
}

function closeMenu(el) {
  el.setAttribute('aria-expanded', false);
}

function openMenu(el) {
  const expandedMenu = document.querySelector('.filter-button[aria-expanded=true]');
  if (expandedMenu) { closeMenu(expandedMenu); }
  el.setAttribute('aria-expanded', true);
}

function filterSearch(e) {
  const { target } = e;
  const { value } = target;
  const parent = target.parentElement.parentElement;
  parent.querySelectorAll('.filter-option').forEach((option) => {
    if (!value.length || option.textContent.toLowerCase().includes(value)) {
      option.classList.remove('hide');
    } else {
      option.classList.add('hide');
    }
  });
}

function enableSearch(id) {
  const menu = document.querySelector(`[aria-labelledby='${id}']`);
  const input = menu.querySelector('input');
  input.addEventListener('keyup', filterSearch);
}

function disableSearch(id) {
  const menu = document.querySelector(`[aria-labelledby='${id}']`);
  const input = menu.querySelector('input');
  input.value = '';
  const parent = input.parentElement.parentElement;
  parent.querySelectorAll('.filter-option').forEach((option) => {
    option.classList.remove('hide');
  });
  input.removeEventListener('keyup', filterSearch);
}

function closeOnDocClick(e) {
  const { target } = e;
  const curtain = document.querySelector('.filter-curtain');
  if (target === curtain) {
    const open = document.querySelector('.filter-button[aria-expanded=true]');
    closeMenu(open);
    disableSearch(open.id);
    curtain.classList.add('hide');
  }
}

function closeCurtain() {
  const curtain = document.querySelector('.filter-curtain');
  curtain.classList.add('hide');
  window.removeEventListener('click', closeOnDocClick);
}

function openCurtain() {
  const curtain = document.querySelector('.filter-curtain');
  curtain.classList.remove('hide');
  window.addEventListener('click', closeOnDocClick);
}

function toggleMenu(e) {
  const button = e.target.closest('[role=button]');
  const expanded = button.getAttribute('aria-expanded');
  if (expanded === 'true') {
    closeMenu(button);
    disableSearch(button.id);
    closeCurtain();
  } else {
    openMenu(button);
    enableSearch(button.id);
    openCurtain();
  }
}

function buildSelectedFilter(name) {
  const a = document.createElement('a');
  a.classList.add('selected-filter');
  a.setAttribute('tabindex', 0);
  a.textContent = name;
  return a;
}

function clearFilter(e, block, config) {
  const { target } = e;
  const checked = document
    .querySelector(`input[name='${target.textContent}']`);
  if (checked) { checked.checked = false; }
  delete config.selectedProducts;
  delete config.selectedIndustries;
  // eslint-disable-next-line no-use-before-define
  applyCurrentFilters(block, config);
}

function applyCurrentFilters(block, config, close) {
  const filters = {};
  document.querySelectorAll('.filter-options').forEach((filter) => {
    const type = filter.getAttribute('data-type');
    const subfilters = [];
    filter.querySelectorAll('input[type=checkbox]').forEach((box) => {
      if (box.checked) {
        const boxType = box.parentElement.parentElement.getAttribute('data-type');
        const capBoxType = boxType.charAt(0).toUpperCase() + boxType.slice(1);
        subfilters.push(box.name);
        if (config[`selected${capBoxType}`]) {
          config[`selected${capBoxType}`] += `, ${box.name}`;
        } else {
          config[`selected${capBoxType}`] = box.name;
        }
      }
    });
    if (subfilters.length) {
      filters[type] = subfilters;
    }
    if (close) {
      const id = filter.parentElement.getAttribute('aria-labelledby');
      const dropdown = document.getElementById(id);
      closeMenu(dropdown);
    }
  });
  const selectedContainer = document.querySelector('.selected-container');
  const selectedFilters = selectedContainer.querySelector('.selected-filters');
  selectedFilters.innerHTML = '';

  if (Object.keys(filters).length > 0) {
    Object.keys(filters).forEach((filter) => {
      filters[filter].forEach((f) => {
        const selectedFilter = buildSelectedFilter(f);
        selectedFilter.addEventListener('click', (e) => {
          clearFilter(e, block, config);
        });
        selectedFilters.append(selectedFilter);
      });
    });
    selectedContainer.classList.remove('hide');
  } else {
    selectedContainer.classList.add('hide');
  }
  if (block) {
    block.innerHTML = '';
    // eslint-disable-next-line no-use-before-define
    decorateArticleFeed(block, config);
  }
}

function clearFilters(e, block, config) {
  const type = e.target.classList[e.target.classList.length - 1];
  let target = document;
  if (type === 'reset') {
    target = e.target.parentNode.parentNode;
  }
  const dropdowns = target.querySelectorAll('.filter-options');
  dropdowns.forEach((dropdown) => {
    const checked = dropdown.querySelectorAll('input:checked');
    checked.forEach((box) => { box.checked = false; });
  });
  delete config.selectedProducts;
  delete config.selectedIndustries;
  applyCurrentFilters(block, config);
}

function buildFilterOption(itemName, type) {
  const name = itemName.replace(/\*/gm, '');

  const option = document.createElement('li');
  option.classList
    .add('filter-option', `filter-option-${type}`);

  const checkbox = document.createElement('input');
  checkbox.id = name;
  checkbox.setAttribute('name', name);
  checkbox.setAttribute('type', 'checkbox');

  const label = document.createElement('label');
  label.setAttribute('for', name);
  label.textContent = name;

  option.append(checkbox, label);
  return option;
}

function buildFilter(type, tax, ph, block, config) {
  const container = document.createElement('div');
  container.classList.add('filter');

  const button = document.createElement('a');
  button.classList.add('filter-button');
  button.id = `${type}-filter-button`;
  button.setAttribute('aria-haspopup', true);
  button.setAttribute('aria-expanded', false);
  button.setAttribute('role', 'button');
  button.textContent = tax.getCategoryTitle(type);
  button.addEventListener('click', toggleMenu);

  const dropdown = document.createElement('div');
  dropdown.classList.add('filter-dropdown');
  dropdown.setAttribute('aria-labelledby', `${type}-filter-button`);
  dropdown.setAttribute('role', 'menu');

  const SEARCH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" focusable="false">
    <path d="M14 2A8 8 0 0 0 7.4 14.5L2.4 19.4a1.5 1.5 0 0 0 2.1 2.1L9.5 16.6A8 8 0 1 0 14 2Zm0 14.1A6.1 6.1 0 1 1 20.1 10 6.1 6.1 0 0 1 14 16.1Z"></path>
  </svg>`;
  const searchBar = document.createElement('div');
  searchBar.classList.add('filter-search');
  searchBar.insertAdjacentHTML('afterbegin', SEARCH_ICON);
  const searchField = document.createElement('input');
  searchField.setAttribute('id', `${type}-filter-search`);
  searchField.setAttribute('aria-label', ph.search);
  searchField.setAttribute('placeholder', ph.search);
  searchBar.append(searchField);

  const options = document.createElement('ul');
  options.classList.add('filter-options');
  options.setAttribute('data-type', type);
  const category = tax.getCategory(tax[`${type.toUpperCase()}`]);
  category.forEach((topic) => {
    const item = tax.get(topic, tax[`${type.toUpperCase()}`]);
    if (item.level === 1) {
      const option = buildFilterOption(item.name, 'primary');
      options.append(option);
      item.children.forEach((child) => {
        const nestedOption = buildFilterOption(child, 'nested');
        options.append(nestedOption);
      });
    }
  });

  const footer = document.createElement('div');
  footer.classList.add('filter-dropdown-footer');

  const resetBtn = document.createElement('a');
  resetBtn.classList.add('button', 'small', 'reset');
  resetBtn.textContent = ph.reset;
  resetBtn.addEventListener('click', clearFilters);

  const applyBtn = document.createElement('a');
  applyBtn.classList.add('button', 'small', 'apply');
  applyBtn.textContent = ph.apply;
  applyBtn.addEventListener('click', () => {
    sampleRUM('apply-topic-filter');
    delete config.selectedProducts;
    delete config.selectedIndustries;
    closeCurtain();
    disableSearch(`${type}-filter-button`);
    applyCurrentFilters(block, config, 'close');
  });

  footer.append(resetBtn, applyBtn);

  dropdown.append(searchBar, options, footer);
  container.append(button, dropdown);
  return container;
}

async function filterArticles(config, feed, limit, offset) {
  const result = [];

  /* filter posts by category, tag and author */
  const filters = {};
  Object.keys(config).forEach((key) => {
    const filterNames = ['tags', 'topics', 'selectedProducts', 'selectedIndustries', 'author', 'category', 'exclude'];
    if (filterNames.includes(key)) {
      const vals = config[key];
      const v = vals.split(',');
      filters[key] = v.map((e) => e.toLowerCase().trim());
    }
  });

  while ((feed.data.length < limit + offset) && (!feed.complete)) {
    const beforeLoading = new Date();
    // eslint-disable-next-line no-await-in-loop
    const index = await fetchBlogArticleIndex();
    const indexChunk = index.data.slice(feed.cursor);

    const beforeFiltering = new Date();
    /* filter and ignore if already in result */
    const feedChunk = indexChunk.filter((article) => {
      const matchedAll = Object.keys(filters).every((key) => {
        if (key === 'exclude' || key === 'tags' || key === 'topics') {
          const tax = getArticleTaxonomy(article);
          const matchedFilter = filters[key].some((val) => (tax.allTopics
            && tax.allTopics.map((t) => t.toLowerCase()).includes(val)));
          return key === 'exclude' ? !matchedFilter : matchedFilter;
        }
        if (key === 'selectedProducts' || key === 'selectedIndustries') {
          const tax = getArticleTaxonomy(article);
          if (filters.selectedProducts && filters.selectedIndustries) {
            // match product && industry
            const matchProduct = filters.selectedProducts.some((val) => (tax.allTopics
              && tax.allTopics.map((t) => t.toLowerCase()).includes(val)));
            const matchIndustry = filters.selectedIndustries.some((val) => (tax.allTopics
              && tax.allTopics.map((t) => t.toLowerCase()).includes(val)));
            return matchProduct && matchIndustry;
          }
          const matchedFilter = filters[key].some((val) => (tax.allTopics
            && tax.allTopics.map((t) => t.toLowerCase()).includes(val)));
          return matchedFilter;
        }
        const matchedFilter = filters[key].some((val) => (article[key]
          && article[key].toLowerCase().includes(val)));
        return matchedFilter;
      });
      return (matchedAll && !result.includes(article) && !isCardOnPage(article));
    });
    stamp(`chunk measurements - loading: ${beforeFiltering - beforeLoading}ms filtering: ${new Date() - beforeFiltering}ms`);
    feed.cursor = index.data.length;
    feed.complete = index.complete;
    feed.data = [...feed.data, ...feedChunk];
  }
}


async function decorateArticleFeed(articleFeedEl, config, offset = 0,
  feed = { data: [], complete: false, cursor: 0 }) {
  let articleCards = articleFeedEl.querySelector('.article-cards');
  if (!articleCards) {
    articleCards = document.createElement('div');
    articleCards.className = 'article-cards';
    articleFeedEl.appendChild(articleCards);
  }
  // display spinner
  const placeholders = await fetchPlaceholders();
  const emptyDiv = document.createElement('div');
  emptyDiv.classList.add('article-cards-empty');
  const spinner = document.createElement('div');
  spinner.classList.add('spinner');
  emptyDiv.append(spinner);
  articleCards.append(emptyDiv);

  const limit = 12;
  const pageEnd = offset + limit;
  await filterArticles(config, feed, limit, offset);
  const articles = feed.data;
  if (articles.length) {
    // results were found
    emptyDiv.remove();
  } else if (config.selectedProducts || config.selectedIndustries) {
    // no user filtered results were found
    spinner.remove();
    const noMatches = document.createElement('p');
    noMatches.innerHTML = `<strong>${placeholders['no-matches']}</strong>`;
    const userHelp = document.createElement('p');
    userHelp.classList.add('article-cards-empty-filtered');
    userHelp.textContent = placeholders['user-help'];
    emptyDiv.append(noMatches, userHelp);
  } else {
    // no results were found
    spinner.remove();
    const noResults = document.createElement('p');
    noResults.innerHTML = `<strong>${placeholders['no-results']}</strong>`;
    emptyDiv.append(noResults);
  }
  const max = pageEnd > articles.length ? articles.length : pageEnd;
  for (let i = offset; i < max; i += 1) {
    const article = articles[i];
    const card = buildArticleCard(article);
    articleCards.append(card);
  }

  if (articles.length > pageEnd || !feed.complete) {
    const loadMore = document.createElement('a');
    loadMore.className = 'load-more button small primary light';
    loadMore.href = '#';
    loadMore.textContent = placeholders['load-more'];
    articleFeedEl.append(loadMore);
    loadMore.addEventListener('click', (event) => {
      event.preventDefault();
      loadMore.remove();
      decorateArticleFeed(articleFeedEl, config, pageEnd, feed);
    });
  }
  articleFeedEl.classList.add('appear');
}

async function decorateFeedFilter(articleFeedEl, config) {
  const placeholders = await fetchPlaceholders();
  const taxonomy = getTaxonomy();
  const parent = document.querySelector('.article-feed-container');

  const curtain = document.createElement('div');
  curtain.classList.add('filter-curtain', 'hide');
  document.querySelector('main').append(curtain);

  // FILTER CONTAINER
  const filterContainer = document.createElement('div');
  filterContainer.classList.add('filter-container');
  const filterWrapper = document.createElement('div');

  const filterText = document.createElement('p');
  filterText.classList.add('filter-text');
  filterText.textContent = placeholders.filters;

  const productsDropdown = buildFilter('products', taxonomy, placeholders, articleFeedEl, config);
  const industriesDropdown = buildFilter('industries', taxonomy, placeholders, articleFeedEl, config);

  filterWrapper.append(filterText, productsDropdown, industriesDropdown);
  filterContainer.append(filterWrapper);

  parent.parentElement.insertBefore(filterContainer, parent);

  // SELECTED CONTAINER
  const selectedContainer = document.createElement('div');
  selectedContainer.classList.add('selected-container', 'hide');
  const selectedWrapper = document.createElement('div');

  const selectedText = document.createElement('p');
  selectedText.classList.add('selected-text');
  selectedText.textContent = placeholders['showing-articles-for'];

  const selectedCategories = document.createElement('span');
  selectedCategories.classList.add('selected-filters');

  const clearBtn = document.createElement('a');
  clearBtn.classList.add('button', 'small', 'clear');
  clearBtn.textContent = placeholders['clear-all'];
  clearBtn.addEventListener('click',
    (e) => clearFilters(e, articleFeedEl, config));

  selectedWrapper.append(selectedText, selectedCategories, clearBtn);
  selectedContainer.append(selectedWrapper);
  parent.parentElement.insertBefore(selectedContainer, parent);
}

export default async function init(articleFeed) {
  const config = readBlockConfig(articleFeed);
  articleFeed.innerHTML = '';
  if (config.filters) {
    decorateFeedFilter(block, config);
  }
  decorateArticleFeed(articleFeed, config);
}
