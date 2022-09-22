/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
import {
  loadTingleModalFiles,
  showAlert,
  showConfirm,
} from './send-to-caas.js';
import {
  getCardMetadata,
  getCaasProps,
  getImsToken,
  loadCaasTags,
  postDataToCaaS,
  setConfig,
} from './send-utils.js';

const sheetTagMap = {
  'adobe-com-enterprise:industry': 'caas:industry',
  'adobe-com-enterprise:industry/education': 'caas:industry/education',
  'adobe-com-enterprise:industry/financial-services': 'caas:industry/financial-services',
  'adobe-com-enterprise:industry/government': 'caas:industry/government',
  'adobe-com-enterprise:industry/healthcare': 'caas:industry/healthcare',
  'adobe-com-enterprise:industry/high-tech': 'caas:industry/high-tech',
  'adobe-com-enterprise:industry/manufacturing': 'caas:industry/manufacturing',
  'adobe-com-enterprise:industry/media-and-entertainment': 'caas:industry/media-and-entertainment',
  'adobe-com-enterprise:industry/non-profit': 'caas:industry/non-profit',
  'adobe-com-enterprise:industry/retail': 'caas:industry/retail',
  'adobe-com-enterprise:industry/telecom': 'caas:industry/telecommunications',
  'adobe-com-enterprise:industry/travel-and-hospitality': 'caas:industry/travel-and-hospitality',
  'adobe-com-enterprise:product': 'caas:products',
  'adobe-com-enterprise:product/acrobat-dc': 'caas:products/acrobat',
  'adobe-com-enterprise:product/advertising-cloud': 'caas:products/adobe-advertising-cloud',
  'adobe-com-enterprise:product/analytics': 'caas:products/adobe-analytics',
  'adobe-com-enterprise:product/audience-manager': 'caas:products/adobe-audience-manager',
  'adobe-com-enterprise:product/campaign': 'caas:products/adobe-campaign',
  'adobe-com-enterprise:product/captivate': 'caas:products/captivate',
  'adobe-com-enterprise:product/commerce-cloud': 'caas:products/adobe-commerce-cloud',
  'adobe-com-enterprise:product/connect': 'caas:products/connect',
  'adobe-com-enterprise:product/creative-cloud': 'caas:products/adobe-creative-cloud',
  'adobe-com-enterprise:product/document_cloud': 'caas:products/adobe-document-cloud',
  'adobe-com-enterprise:product/experience-cloud': 'caas:products/adobe-experience-cloud',
  'adobe-com-enterprise:product/experience-manager': 'caas:products/adobe-experience-manager',
  'adobe-com-enterprise:product/experience-manager-assets': 'caas:products/adobe-experience-manager-assets',
  'adobe-com-enterprise:product/experience-manager-forms': 'caas:products/adobe-experience-manager-forms',
  'adobe-com-enterprise:product/experience-manager-sites': 'caas:products/adobe-experience-manager-sites',
  'adobe-com-enterprise:product/experience-platform': 'caas:products/adobe-experience-platform',
  'adobe-com-enterprise:product/journey-optimizer': 'caas:products/adobe-journey-optimizer',
  'adobe-com-enterprise:product/marketo-measure': 'caas:products/marketo-engage-bizible',
  'adobe-com-enterprise:product/primetime': 'caas:products/adobe-primetime',
  'adobe-com-enterprise:product/real-time-customer-data-platform': 'caas:products/adobe-real-time-cdp',
  'adobe-com-enterprise:product/sensei': 'caas:products/adobe-sensei',
  'adobe-com-enterprise:product/sign': 'caas:products/adobe-sign',
  'adobe-com-enterprise:product/target': 'caas:products/adobe-target',
  'adobe-com-enterprise:product/workfront': 'caas:products/workfront',
  'adobe-com-enterprise:product/learning-manager': 'caas:products/learning-manager',
  'adobe-com-enterprise:product/customer-journey-analytics': 'caas:products/customer-journey-analytics',
  'adobe-com-enterprise:product/adobe-experience-manager-guides': 'caas:products/adobe-experience-manager-guides',
  'adobe-com-enterprise:topic': 'caas:topic',
  'adobe-com-enterprise:topic/advertising': 'caas:topic/advertising',
  'adobe-com-enterprise:topic/analytics': 'caas:topic/analytics',
  'adobe-com-enterprise:topic/commerce': 'caas:topic/commerce',
  'adobe-com-enterprise:topic/content-management': 'caas:topic/content-management',
  'adobe-com-enterprise:topic/customer-intelligence': 'caas:topic/customer-intelligence',
  'adobe-com-enterprise:topic/data-management': 'caas:topic/data-management',
  'adobe-com-enterprise:topic/digital-foundation': 'caas:topic/digital-foundation',
  'adobe-com-enterprise:topic/digital-trends': 'caas:topic/digital-trends',
  'adobe-com-enterprise:topic/documents-and-e-signatures': 'caas:topic/electronic-signature',
  'adobe-com-enterprise:topic/email-marketing': 'caas:topic/email-marketing',
  'adobe-com-enterprise:topic/marketing-automation': 'caas:topic/marketing-automation',
  'adobe-com-enterprise:topic/personalization': 'caas:topic/personalization',
};

const fetchExcelJson = async (url) => {
  const resp = await fetch(url);
  if (resp.ok) {
    const json = await resp.json();
    return json.data;
  }
  return [];
};

const checkIms = async () => {
  const accessToken = await getImsToken();
  if (!accessToken) {
    const shouldLogIn = await showConfirm(
      'You must be logged in with an Adobe ID in order to publish to CaaS.\nDo you want to log in?',
    );
    if (shouldLogIn) {
      window.adobeIMS.signIn();
    }
    return false;
  }
  return accessToken;
};

const getPageDom = async (url) => {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return { error: `${resp.status}: ${resp.statusText}` };
    const html = await resp.text();
    const dp = new DOMParser();
    const dom = dp.parseFromString(html, 'text/html');
    return { dom, lastModified: resp.headers.get('last-modified') };
  } catch (err) {
    return { error: err.message };
  }
};

const updateTagsFromSheetData = (tags, sheetTagsStr) => {
  const sheetTags = sheetTagsStr.split(',');
  const tagSet = new Set(tags.map((t) => t.id));

  sheetTags.forEach((sheetTag) => {
    if (sheetTag.startsWith('caas:')) {
      tagSet.add(sheetTag);
      return;
    }
    const newTag = sheetTagMap[sheetTag];
    if (newTag) {
      tagSet.add(newTag);
    }
  });

  return [...tagSet].map((t) => ({ id: t }));
};

const processData = async (data, accessToken) => {
  const errorArr = [];
  const successArr = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const page of data) {
    if (page.Path === 'stop') break; // debug, stop on empty line

    const { dom, error, lastModified } = await getPageDom(page.Path);
    if (error) {
      errorArr.push({ url: page.Path, error });
      continue;
    }

    setConfig({ bulkPublish: true, doc: dom, pageUrl: page.Path, lastModified });
    const { caasMetadata, errors, tags, tagErrors } = await getCardMetadata({ prodUrl: page.Path.replace('https://', '') });

    if (errors.length) {
      errorArr.push({ url: page.Path, error: errors.join('\n') });
      continue;
    }

    // Code for tags from spreadsheet
    const updatedTags = updateTagsFromSheetData(caasMetadata.tags, page['cq:tags']);
    caasMetadata.tags = updatedTags;

    const caasProps = getCaasProps(caasMetadata);
    const caasEnv = document.getElementById('caas-env-select')?.value?.toLowerCase();
    const draftOnly = document.getElementById('draftcb')?.checked;

    const response = await postDataToCaaS({
      accessToken, caasEnv, caasProps, draftOnly,
    });

    if (response.success) {
      successArr.push({ url: page.Path, caasMetadata });
    } else {
      errorArr.push({ url: page.Path, response });
    }
  }

  document.getElementById('errors').value = JSON.stringify(errorArr, null, 2);
  document.getElementById('success').value = JSON.stringify(successArr, null, 2);
  showAlert(`Successfully published ${successArr.length} pages. \n\n Failed to publish ${errorArr.length} pages.`);
};

const bulkPublish = async () => {
  const accessToken = await checkIms();
  if (!accessToken) return;

  const excelJsonUrl = document.getElementById('excelfile').value;
  if (!excelJsonUrl) {
    await showAlert('Please enter an excel json url.');
  }

  const data = await fetchExcelJson(excelJsonUrl);
  const { success, errors } = await processData(data, accessToken);
};

const init = async () => {
  setConfig({
    host: 'business.adobe.com',
    project: '',
    branch: 'main',
    repo: 'bacom',
    owner: 'adobecom',
  });
  await loadTingleModalFiles();
  await loadCaasTags();
  const bulkPublishBtn = document.querySelector('#bulkpublish');
  bulkPublishBtn.addEventListener('click', () => bulkPublish());
};

export default init;
