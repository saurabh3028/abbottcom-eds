import { getConfig } from '../../utils/utils.js';

// TODO: add PEP segment map here when we have it;
// However, we need to decide if these are relevant to others or not;
// if not, we should find a better place for them
// and add a method to return raw segments
const ENTITLEMENT_MAP = {
  '51b1f617-2e43-4e91-a98a-3b7716ecba8f': 'photoshop-any',
  '8ba78b22-90fb-4b97-a1c4-f8c03a45cbc2': 'indesign-any',
  '8d3c8ac2-2937-486b-b6ff-37f02271b09b': 'illustrator-any',
  'fd30e9c7-9ae9-44db-8e70-5c652a5bb1d2': 'cc-all-apps-any',
  '4e2f2a6e-48c4-49eb-9dd5-c44070abb3f0': 'after-effects-any',
  'e7650448-268b-4a0d-9795-05f604d7e42f': 'lightroom-any',
  '619130fc-c7b5-4b39-a687-b32061326869': 'premiere-pro-any',
  'cec4d899-4b41-469e-9f2d-4658689abf29': 'phsp-ltr-bundle',
  '8da44606-9841-43d0-af72-86d5a9d3bba0': 'cc-photo',
  'ab713720-91a2-4e8e-b6d7-6f613e049566': 'any-cc-product-no-stock',
  'b0f65e1c-7737-4788-b3ae-0011c80bcbe1': 'any-cc-product-with-stock',
  '934fdc1d-7ba6-4644-908b-53e01e550086': 'any-dc-product',
  '6dfcb769-324f-42e0-9e12-1fc4dc0ee85b': 'always-on-promo',
  '015c52cb-30b0-4ac9-b02e-f8716b39bfb6': 'not-q-always-on-promo',
  '42e06851-64cd-4684-a54a-13777403487a': '3d-substance-collection',
  'eda8c774-420b-44c2-9006-f9a8d0fb5168': '3d-substance-texturing',
};

export const getEntitlementMap = async () => {
  const { env, consumerEntitlements } = getConfig();
  if (env?.name === 'prod') return { ...consumerEntitlements, ...ENTITLEMENT_MAP };
  const { default: STAGE_ENTITLEMENTS } = await import('./stage-entitlements.js');
  return { ...consumerEntitlements, ...STAGE_ENTITLEMENTS };
};

const getEntitlements = async (data) => {
  const entitlementMap = await getEntitlementMap();

  return data.flatMap((destination) => {
    const ents = destination.segments?.flatMap((segment) => {
      const entMatch = entitlementMap[segment.id];
      return entMatch ? [entMatch] : [];
    });

    return ents || [];
  });
};

export default function init(data) {
  return getEntitlements(data);
}
