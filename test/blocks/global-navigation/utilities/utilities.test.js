import { expect } from '@esm-bundle/chai';
import {
  toFragment,
  getFedsPlaceholderConfig,
  getFedsContentRoot,
  federatePictureSources,
  getAnalyticsValue,
  decorateCta,
  closeAllDropdowns,
  trigger,
  getExperienceName,
} from '../../../../libs/blocks/global-navigation/utilities/utilities.js';
import { setConfig } from '../../../../libs/utils/utils.js';
import { createFullGlobalNavigation, config } from '../test-utilities.js';

describe('global navigation utilities', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });
  it('toFragment', () => {
    expect(toFragment).to.exist;
    const fragment = toFragment`<div>test</div>`;
    expect(fragment.tagName).to.equal('DIV');
    expect(fragment.innerHTML).to.equal('test');
    // also renders nested fragments
    const fragment2 = toFragment`<span>${fragment}</span>`;
    expect(fragment2.innerHTML).to.equal('<div>test</div>');
    expect(fragment2.tagName).to.equal('SPAN');
  });

  // TODO - no tests for using the the live url and .hlx. urls
  // as mocking window.location.origin is not possible
  describe('getFedsContentRoot', () => {
    it('should return content source for localhost', () => {
      const contentSource = getFedsContentRoot();
      expect(contentSource).to.equal('https://main--milo--adobecom.hlx.page');
    });
  });

  describe('federatePictureSources', () => {
    it('should use federated content root for image sources', async () => {
      const imgPath = 'test/blocks/global-navigation/mocks/media_medium_dropdown.png';
      const template = toFragment`<picture>
          <source
            type="image/webp"
            srcset="./${imgPath}"
            media="(min-width: 600px)"/>
          <source
            type="image/webp"
            srcset="./${imgPath}"/>
          <source
            type="image/png"
            srcset="/${imgPath}"
            media="(min-width: 600px)"/>
          <img
            loading="lazy"
            alt=""
            type="image/png"
            src="/${imgPath}"/>
        </picture>`;

      federatePictureSources(template);
      document.querySelectorAll('source, img').forEach((source) => {
        const attr = source.hasAttribute('src') ? 'src' : 'srcset';
        expect(source.getAttribute(attr)).to.equal(`https://main--milo--adobecom.hlx.page/${imgPath}`);
      });
    });
  });

  // TODO - no tests for using the the live url and .hlx. urls
  // as mocking window.location.origin is not possible
  describe('getFedsPlaceholderConfig', () => {
    it('should return contentRoot for localhost', () => {
      const locale = { locale: { ietf: 'en-US', prefix: '' } };
      setConfig({ ...config, ...locale });
      const placeholderConfig = { useCache: false };
      const { locale: { ietf, prefix, contentRoot } } = getFedsPlaceholderConfig(placeholderConfig);
      expect(ietf).to.equal('en-US');
      expect(prefix).to.equal('');
      expect(contentRoot).to.equal('https://main--milo--adobecom.hlx.page');
    });

    it('should return a config object for a specific locale', () => {
      const customConfig = {
        locales: {
          '': { ietf: 'en-US' },
          fi: { ietf: 'fi-FI' },
        },
        pathname: '/fi/',
      };
      setConfig({ ...config, ...customConfig });
      const placeholderConfig = { useCache: false };
      const { locale: { ietf, prefix, contentRoot } } = getFedsPlaceholderConfig(placeholderConfig);
      expect(ietf).to.equal('fi-FI');
      expect(prefix).to.equal('/fi');
      expect(contentRoot).to.equal('https://main--milo--adobecom.hlx.page/fi');
    });
  });

  it('getAnalyticsValue should return a string', () => {
    expect(getAnalyticsValue('test')).to.equal('test');
    expect(getAnalyticsValue('test test')).to.equal('test_test');
    expect(getAnalyticsValue('test test 1', 2)).to.equal('test_test_1-2');
  });

  describe('decorateCta', () => {
    it('should return a fragment for a primary cta', () => {
      const elem = toFragment`<a href="test">test</a>`;
      const el = decorateCta({ elem });
      expect(el.tagName).to.equal('DIV');
      expect(el.className).to.equal('feds-cta-wrapper');
      expect(el.children[0].tagName).to.equal('A');
      expect(el.children[0].className).to.equal('feds-cta feds-cta--primary');
      expect(el.children[0].getAttribute('href')).to.equal('test');
      expect(el.children[0].getAttribute('daa-ll')).to.equal('test');
      expect(el.children[0].textContent.trim()).to.equal('test');
    });

    it('should return a fragment for a secondary cta', () => {
      const elem = toFragment`<a href="test">test</a>`;
      const el = decorateCta({ elem, type: 'secondaryCta' });
      expect(el.tagName).to.equal('DIV');
      expect(el.className).to.equal('feds-cta-wrapper');
      expect(el.children[0].tagName).to.equal('A');
      expect(el.children[0].className).to.equal('feds-cta feds-cta--secondary');
      expect(el.children[0].getAttribute('href')).to.equal('test');
      expect(el.children[0].getAttribute('daa-ll')).to.equal('test');
      expect(el.children[0].textContent.trim()).to.equal('test');
    });
  });

  it('closeAllDropdowns should close all dropdowns, respecting the globalNavSelector', async () => {
    // Build navigation
    await createFullGlobalNavigation({ });
    // Mark first element with dropdown as being expanded
    const firstNavItemWithDropdown = document.querySelector('.feds-navLink--hoverCaret');
    firstNavItemWithDropdown.setAttribute('aria-expanded', true);
    // Call method to close all dropdown menus
    closeAllDropdowns();
    // Expect aria-expanded value to have been reset
    expect(document.querySelectorAll('[aria-expanded="true"]').length).to.equal(0);
  });

  it('closeAllDropdowns doesn\'t close items with the "fedsPreventautoclose" attribute', async () => {
    // Build navigation
    await createFullGlobalNavigation({ });
    // Get first two elements with a dropdown and expand them
    const itemsWithDropdown = document.querySelectorAll('.feds-navLink--hoverCaret');
    const [firstNavItemWithDropdown, secondNavItemWithDropdown] = itemsWithDropdown;
    firstNavItemWithDropdown.setAttribute('aria-expanded', true);
    secondNavItemWithDropdown.setAttribute('aria-expanded', true);
    // Set the "data-feds-preventautoclose" attribute on the first item with a dropdown
    firstNavItemWithDropdown.setAttribute('data-feds-preventautoclose', '');
    // Expect that two dropdowns are expanded
    expect(document.querySelectorAll('[aria-expanded="true"]').length).to.equal(2);
    // Call method to close all dropdown menus
    closeAllDropdowns();
    // Expect aria-expanded value to not have been reset for the first item with a dropdown
    expect(firstNavItemWithDropdown.hasAttribute('aria-expanded')).to.be.true;
    expect(document.querySelectorAll('[aria-expanded="true"]').length).to.equal(1);
  });

  it('trigger manages the aria-expanded state of a global-navigation element', async () => {
    // Build navigation
    await createFullGlobalNavigation({ });
    // Get first element with a dropdown
    const element = document.querySelector('.feds-navLink--hoverCaret');
    // Calling 'trigger' should open the element
    expect(trigger({ element })).to.equal(true);
    expect(element.getAttribute('aria-expanded')).to.equal('true');
    // Calling 'trigger' again should close the element
    expect(trigger({ element })).to.equal(false);
    expect(element.getAttribute('aria-expanded')).to.equal('false');
  });

  it('getExperienceName defaults to imsClientId', () => {
    const experienceName = getExperienceName();
    expect(experienceName).to.equal(config.imsClientId);
  });

  it('getExperienceName replaces default experience name with client ID', () => {
    // If the experience name is the default one (gnav), the imsClientId should be used instead
    const gnavSourceMeta = toFragment`<meta name="gnav-source" content="http://localhost:2000/ch_de/libs/feds/gnav">`;
    document.head.append(gnavSourceMeta);
    let experienceName = getExperienceName();
    expect(experienceName).to.equal(config.imsClientId);
    // If the experience name is not the default one, the custom name should be used
    gnavSourceMeta.setAttribute('content', 'http://localhost:2000/ch_de/libs/feds/custom-gnav');
    experienceName = getExperienceName();
    expect(experienceName).to.equal('custom-gnav');
    gnavSourceMeta.remove();
  });

  it('getExperienceName is empty if no imsClientId is defined', () => {
    const ogImsClientId = config.imsClientId;
    delete config.imsClientId;
    setConfig(config);
    const experienceName = getExperienceName();
    expect(experienceName).to.equal('');
    config.imsClientId = ogImsClientId;
    setConfig(config);
  });
});
