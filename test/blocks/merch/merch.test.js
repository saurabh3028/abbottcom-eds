import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

import merch, {
  buildCta,
  getCheckoutContext,
  priceLiteralsURL,
} from '../../../libs/blocks/merch/merch.js';

import { mockFetch, unmockFetch } from './mocks/fetch.js';
import { mockIms, unmockIms } from './mocks/ims.js';
import { createTag, setConfig } from '../../../libs/utils/utils.js';

const config = {
  codeRoot: '/libs',
  commerce: { priceLiteralsURL },
  env: { name: 'prod' },
};

/**
 * utility function that tests Price spans against mock HTML
 *
 * @param {util} selector price span selector
 * @param {*} expectedAttributes { <attribute key in element dataset>:
 * <expected attribute value, UNDEF if should be undefined>}
 */
const validatePriceSpan = async (selector, expectedAttributes) => {
  const el = await merch(document.querySelector(
    selector,
  ));
  const { nodeName, dataset } = await el.onceSettled();
  expect(nodeName).to.equal('SPAN');
  if (!expectedAttributes.template) {
    expect(dataset.template).to.be.undefined;
  }
  Object.keys(expectedAttributes).forEach((key) => {
    const value = expectedAttributes[key];
    if (value === 'UNDEF') {
      expect(dataset[key]).to.be.undefined;
    } else {
      expect(dataset[key]).to.equal(value);
    }
  });
};

describe('Merch Block', () => {
  after(async () => {
    delete window.lana;
    unmockFetch();
    unmockIms();
  });

  before(async () => {
    window.lana = { log: () => { } };
    document.head.innerHTML = await readFile({ path: './mocks/head.html' });
    document.body.innerHTML = await readFile({ path: './mocks/body.html' });
    await mockIms('CH');
    await mockFetch();
    setConfig(config);
  });

  beforeEach(async () => {
    const { init, Log } = await import('../../../libs/deps/commerce.js');
    await init(() => config);
    Log.reset();
    Log.use(Log.Plugins.quietFilter);
  });

  it('does not decorate merch with bad content', async () => {
    let el = document.querySelector('.bad-content');
    expect(await merch(el)).to.be.undefined;
    el = document.querySelector('.merch.bad-content');
    expect(await merch(el)).to.be.null;
  });

  describe('Prices', () => {
    it('renders merch link to price without term (new)', async () => {
      validatePriceSpan('.merch.price.hide-term', { displayRecurrence: 'false' });
    });

    it('renders merch link to price with term', async () => {
      validatePriceSpan('.merch.price.term', { displayRecurrence: 'UNDEF' });
    });

    it('renders merch link to price with term and seat', async () => {
      validatePriceSpan('.merch.price.seat', { displayPerUnit: 'true' });
    });

    it('renders merch link to price with term and tax', async () => {
      validatePriceSpan('.merch.price.tax', { displayTax: 'true' });
    });

    it('renders merch link to price with term, seat and tax', async () => {
      validatePriceSpan('.merch.price.seat.tax', { displayTax: 'true' });
    });

    it('renders merch link to strikethrough price with term, seat and tax', async () => {
      validatePriceSpan('.merch.price.strikethrough', { template: 'strikethrough' });
    });

    it('renders merch link to optical price with term, seat and tax', async () => {
      validatePriceSpan('.merch.price.optical', { template: 'optical' });
    });
  });

  describe('Promo Prices', () => {
    it('renders merch link to promo price with discount', async () => {
      validatePriceSpan('.merch.price.oldprice', { promotionCode: 'UNDEF' });
    });

    it('renders merch link to promo price without discount', async () => {
      validatePriceSpan('.merch.strikethrough.oldprice', { template: 'strikethrough', promotionCode: 'UNDEF' });
    });

    it('renders merch link to promo price with discount', async () => {
      validatePriceSpan('.merch.price.promo', { promotionCode: 'nicopromo' });
    });

    it('renders merch link to full promo price', async () => {
      validatePriceSpan('.merch.price.promo', { promotionCode: 'nicopromo' });
    });
  });

  describe('Promo Prices in a fragment', () => {
    it('renders merch link to promo price with discount', async () => {
      validatePriceSpan('.fragment .merch.price.oldprice', { promotionCode: 'UNDEF' });
    });

    it('renders merch link to promo price without discount', async () => {
      validatePriceSpan('.fragment .merch.strikethrough.oldprice', { template: 'strikethrough', promotionCode: 'UNDEF' });
    });

    it('renders merch link to promo price with discount', async () => {
      validatePriceSpan('.fragment .merch.price.promo', { promotionCode: 'nicopromo' });
    });

    it('renders merch link to full promo price', async () => {
      validatePriceSpan('.fragment .merch.price.promo', { promotionCode: 'nicopromo' });
    });
  });

  describe('CTAs', () => {
    it('renders merch link to CTA, default values', async () => {
      const { Defaults } = await import('../../../libs/deps/commerce.js');
      const el = await merch(document.querySelector(
        '.merch.cta',
      ));
      const { dataset, href, nodeName, textContent } = await el.onceSettled();
      const url = new URL(href);
      expect(nodeName).to.equal('A');
      expect(textContent).to.equal('Buy Now');
      expect(el.getAttribute('is')).to.equal('checkout-link');
      expect(dataset.promotionCode).to.equal(undefined);
      expect(dataset.checkoutWorkflow).to.equal(Defaults.checkoutWorkflow);
      expect(dataset.checkoutWorkflowStep).to.equal(Defaults.checkoutWorkflowStep);
      expect(dataset.checkoutMarketSegment).to.equal(undefined);
      expect(url.searchParams.get('cli')).to.equal(Defaults.checkoutClientId);
    });

    it('renders merch link to CTA, config values', async () => {
      const { Defaults, init, reset } = await import('../../../libs/deps/commerce.js');
      reset();
      await init(() => ({ ...config, commerce: { checkoutClientId: 'dc' } }));
      const el = await merch(document.querySelector(
        '.merch.cta.config',
      ));
      const { dataset, href, nodeName, textContent } = await el.onceSettled();
      const url = new URL(href);
      expect(nodeName).to.equal('A');
      expect(textContent).to.equal('Buy Now');
      expect(el.getAttribute('is')).to.equal('checkout-link');
      expect(dataset.promotionCode).to.equal(undefined);
      expect(dataset.checkoutWorkflow).to.equal(Defaults.checkoutWorkflow);
      expect(dataset.checkoutWorkflowStep).to.equal(Defaults.checkoutWorkflowStep);
      expect(dataset.checkoutMarketSegment).to.equal(undefined);
      expect(url.searchParams.get('cli')).to.equal('dc');
    });

    it('renders merch link to CTA, metadata values', async () => {
      const { CheckoutWorkflow, CheckoutWorkflowStep, Defaults, init, reset } = await import('../../../libs/deps/commerce.js');
      reset();
      const metadata = createTag('meta', { name: 'checkout-workflow', content: CheckoutWorkflow.V2 });
      document.head.appendChild(metadata);
      await init(() => config);
      const el = await merch(document.querySelector(
        '.merch.cta.metadata',
      ));
      const { dataset, href, nodeName, textContent } = await el.onceSettled();
      const url = new URL(href);
      expect(nodeName).to.equal('A');
      expect(textContent).to.equal('Buy Now');
      expect(el.getAttribute('is')).to.equal('checkout-link');
      expect(dataset.promotionCode).to.equal(undefined);
      expect(dataset.checkoutWorkflow).to.equal(CheckoutWorkflow.V2);
      expect(dataset.checkoutWorkflowStep).to.equal(CheckoutWorkflowStep.CHECKOUT);
      expect(dataset.checkoutMarketSegment).to.equal(undefined);
      expect(url.searchParams.get('cli')).to.equal(Defaults.checkoutClientId);
      document.head.removeChild(metadata);
      await init(() => config, true);
    });

    it('renders merch link to cta with empty promo', async () => {
      const el = await merch(document.querySelector(
        '.merch.cta.nopromo',
      ));
      const { nodeName, dataset } = await el.onceSettled();
      expect(nodeName).to.equal('A');
      expect(el.getAttribute('is')).to.equal('checkout-link');
      expect(dataset.promotionCode).to.equal(undefined);
    });

    it('renders merch link to cta with empty promo in a fragment', async () => {
      const el = await merch(document.querySelector(
        '.fragment .merch.cta.nopromo',
      ));
      const { nodeName, dataset } = await el.onceSettled();
      expect(nodeName).to.equal('A');
      expect(el.getAttribute('is')).to.equal('checkout-link');
      expect(dataset.promotionCode).to.equal(undefined);
    });

    it('renders merch link to promo cta with discount', async () => {
      const el = await merch(document.querySelector(
        '.merch.cta.promo',
      ));
      const { nodeName, dataset } = await el.onceSettled();
      expect(nodeName).to.equal('A');
      expect(el.getAttribute('is')).to.equal('checkout-link');
      expect(dataset.promotionCode).to.equal('nicopromo');
    });

    it('renders merch link to promo cta with discount in a fragment', async () => {
      const el = await merch(document.querySelector(
        '.fragment .merch.cta.promo',
      ));
      const { nodeName, dataset } = await el.onceSettled();
      expect(nodeName).to.equal('A');
      expect(el.getAttribute('is')).to.equal('checkout-link');
      expect(dataset.promotionCode).to.equal('nicopromo');
    });

    it('renders merch link to UCv2 cta with link-level overrides', async () => {
      const el = await merch(document.querySelector(
        '.merch.cta.link-overrides',
      ));
      const { nodeName, dataset } = await el.onceSettled();
      expect(nodeName).to.equal('A');
      expect(el.getAttribute('is')).to.equal('checkout-link');
      // https://wiki.corp.adobe.com/pages/viewpage.action?spaceKey=BPS&title=UCv2+Link+Creation+Guide
      expect(dataset.checkoutWorkflow).to.equal('UCv2');
      expect(dataset.checkoutWorkflowStep).to.equal('checkout');
      expect(dataset.checkoutMarketSegment).to.equal('EDU');
    });

    it('adds ims country to checkout link', async () => {
      const el = await merch(document.querySelector(
        '.merch.cta.ims',
      ));
      const { dataset } = await el.onceSettled();
      expect(dataset.imsCountry).to.equal('CH');
    });

    it('renders blue CTAs', async () => {
      const els = await Promise.all([...document.querySelectorAll(
        '.merch.cta.strong',
      )].map(merch));
      expect(els.length).to.equal(2);
      els.forEach((el) => {
        expect(el.classList.contains('blue')).to.be.true;
      });
    });

    it('renders large CTA inside a marquee', async () => {
      const el = await merch(document.querySelector(
        '.merch.cta.inside-marquee',
      ));
      const { classList } = await el.onceSettled();
      expect(classList.contains('button-l')).to.be.true;
    });
  });

  describe('Function "getCheckoutContext"', () => {
    it('returns null if context params do not have osi', async () => {
      const el = document.createElement('a');
      const params = new URLSearchParams();
      expect(await getCheckoutContext(el, params)).to.be.null;
    });
  });

  describe('Function "buildCta"', () => {
    it('returns null if context params do not have osi', async () => {
      const el = document.createElement('a');
      const params = new URLSearchParams();
      expect(await buildCta(el, params)).to.be.null;
    });
  });
});
