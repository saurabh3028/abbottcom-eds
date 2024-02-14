import { createTag, getConfig } from '../../utils/utils.js';
import { replaceKey } from '../../features/placeholders.js';

const MANAGE_PLAN_MSG_SUBTYPE = {
  AppLoaded: 'AppLoaded',
  EXTERNAL: 'EXTERNAL',
  SWITCH: 'SWITCH',
  RETURN_BACK: 'RETURN_BACK',
  OrderComplete: 'OrderComplete',
  Error: 'Error',
  Close: 'Close',
};
const isProductFamily = (offer, pfs) => {
  const productFamily = offer?.offer?.product_arrangement?.family;
  return productFamily && pfs.includes(productFamily);
};

let shouldRefetchEntitlements = false;
let { location } = window;
let modal;

function buildUrl(upgradeOffer, upgradable, env) {
  const toOffer = upgradeOffer?.value[0].offerId;
  const fromOffer = upgradable?.offer?.offer_id;
  if (!toOffer || !fromOffer) return undefined;
  const url = new URL(env?.name === 'prod' ? 'https://plan.adobe.com' : 'https://stage.plan.adobe.com');
  url.searchParams.append('intent', 'switch');
  url.searchParams.append('toOfferId', toOffer);
  url.searchParams.append('fromOffer', fromOffer);
  url.searchParams.append('language', 'en'); // todo check where comes from
  url.searchParams.append('surface', 'ADOBE_COM');
  url.searchParams.append('ctx', 'if');
  url.searchParams.append('ctxRtUrl', encodeURIComponent(window.location.href));
  return url.toString();
}

export const handleIFrameEvents = ({ data: msgData }) => {
  let parsedMsg = null;
  try {
    parsedMsg = JSON.parse(msgData);
  } catch (error) {
    return;
  }
  const { app, subType, data } = parsedMsg || {};

  if (app !== 'ManagePlan') return;
  switch (subType) {
    case MANAGE_PLAN_MSG_SUBTYPE.AppLoaded:
      document.querySelector('.upgrade-flow-content iframe')?.classList?.remove('loading');
      document.querySelector('.upgrade-flow-content sp-theme')?.remove();
      break;
    case MANAGE_PLAN_MSG_SUBTYPE.EXTERNAL:
      if (!data?.externalUrl || !data.target) return;
      window.open(data.externalUrl, data.target);
      break;
    case MANAGE_PLAN_MSG_SUBTYPE.SWITCH:
      if (!data?.externalUrl || !data.target) return;
      window.open(data.externalUrl, data.target);
      break;
    case MANAGE_PLAN_MSG_SUBTYPE.RETURN_BACK:
      if (!data?.externalUrl || !data.target) return;
      if (data.returnUrl) {
        window.sessionStorage.setItem('upgradeModalReturnUrl', data.returnUrl);
      }
      window.open(data.externalUrl, data.target);
      break;
    case MANAGE_PLAN_MSG_SUBTYPE.OrderComplete:
      shouldRefetchEntitlements = true;
      break;
    case MANAGE_PLAN_MSG_SUBTYPE.Error:
      break;
    case MANAGE_PLAN_MSG_SUBTYPE.Close:
      if (shouldRefetchEntitlements) {
        location.reload();
      }
      modal?.dispatchEvent(new Event('closeModal'));
      modal = null;
      break;
    default:
      break;
  }
};

export default async function handleUpgradeOffer(
  ctaPF,
  upgradeOffer,
  entitlements,
  SOURCE_PF,
  TARGET_PF,
) {
  if (!TARGET_PF.includes(ctaPF)) return undefined;

  const hasUpgradeTarget = entitlements?.find((offer) => isProductFamily(offer, TARGET_PF));
  if (hasUpgradeTarget) return undefined;

  const changePlanOffers = entitlements?.filter((offer) => offer.change_plan_available === true);
  const upgradable = changePlanOffers?.find((offer) => isProductFamily(offer, SOURCE_PF));
  if (!upgradable) return undefined;

  const { env, base } = getConfig();
  const upgradeUrl = buildUrl(upgradeOffer, upgradable, env);
  if (upgradeUrl) {
    window.addEventListener('message', handleIFrameEvents);
    const { getModal } = await import('../modal/modal.js');
    const showModal = async (e) => {
      e.preventDefault();
      await Promise.all([
        import(`${base}/features/spectrum-web-components/dist/theme.js`),
        import(`${base}/features/spectrum-web-components/dist/progress-circle.js`),
      ]);
      const content = createTag('div', { class: 'upgrade-flow-content' });
      const iframe = createTag('iframe', {
        src: upgradeUrl,
        title: 'Upgrade modal',
        frameborder: '0',
        marginwidth: '0',
        marginheight: '0',
        allowfullscreen: 'true',
        loading: 'lazy',
        class: 'loading upgrade-flow-iframe',
      });
      const pCircle = createTag('sp-progress-circle', { label: 'progress circle', indeterminate: true, size: 'l' });
      const theme = createTag('sp-theme', { theme: 'spectrum', color: 'light', scale: 'medium', dir: 'ltr' });
      theme.append(pCircle);
      content.append(theme);
      content.append(iframe);
      modal = await getModal(null, { id: 'switch-modal', content, closeEvent: 'closeModal', class: ['upgrade-flow-modal'] });
      return modal;
    };
    const text = await replaceKey('upgrade-now', getConfig());
    return { text, url: upgradeUrl, handler: showModal };
  }
  return undefined;
}

export const setModal = (testModal) => {
  modal = testModal;
};

export const setLocation = (testLocation) => {
  location = testLocation;
};
