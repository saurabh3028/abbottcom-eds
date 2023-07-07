import { expect } from '@esm-bundle/chai';
import { readFile } from '@web/test-runner-commands';
import init, {
  filterOfferDetails,
  decorateOfferDetails,
  decorateSearch,
} from '../../../libs/blocks/commerce/commerce.js';

document.body.innerHTML = await readFile({ path: './mocks/body.html' });

const offer = {
  offerType: 'BASE',
  offerId: '01A09572A72A7D7F848721DE4D3C73FA',
  productArrangementCode: 'creative_cloud_all_apps_with_2tb_cloud_services_individual',
  pricePoint: 'INDIV_CCES_COM_2TB',
  customerSegment: 'INDIVIDUAL',
  commitment: 'YEAR',
  term: 'MONTHLY',
  offerSelectorIds: 'Mutn1LYoGojkrcMdCLO7LQlx1FyTHw27ETsfLv0h8DQ',
  priceDetails: {
    price: 10,
    formatString: "'$'0.00",
  },
};

describe('filterOfferDetails', () => {
  it('formats offer details correctly', () => {
    const formattedOffer = filterOfferDetails(offer);
    expect(formattedOffer.offerType).to.equal('BASE');
    expect(formattedOffer.offerId).to.equal('01A09572A72A7D7F848721DE4D3C73FA');
    expect(formattedOffer.productArrangementCode).to.equal('creative_cloud_all_apps_with_2tb_cloud_services_individual');
    expect(formattedOffer.pricePoint).to.equal('INDIV_CCES_COM_2TB');
    expect(formattedOffer.customerSegment).to.equal('INDIVIDUAL');
    expect(formattedOffer.commitment).to.equal('YEAR');
    expect(formattedOffer.term).to.equal('MONTHLY');
    expect(formattedOffer.offerSelectorIds).to.equal('Mutn1LYoGojkrcMdCLO7LQlx1FyTHw27ETsfLv0h8DQ');
    expect(formattedOffer.price).to.equal('$10');
  });
});

describe('decorateOfferDetails', () => {
  it('decorates offer details correctly', async () => {
    const el = document.createElement('div');
    const searchParams = new URLSearchParams('osi=01A09572A72A7D7F848721DE4D3C73FA&perp=false');
    const commerce = {
      ims: { country: Promise.resolve() },
      settings: {
        checkoutClientId: 'test',
        checkoutWorkflow: 'UCv3',
        checkoutWorkflowStep: 'email',
      },
    };
    await decorateOfferDetails(commerce, el, offer, searchParams);
    const offerDetailsList = el.querySelector('.offer-details');
    expect(offerDetailsList).to.exist;
    expect(offerDetailsList.children[0].textContent).to.equal('OFFER TYPE: BASE');
    expect(offerDetailsList.children[1].textContent).to.equal('OFFER ID: 01A09572A72A7D7F848721DE4D3C73FA');
    expect(offerDetailsList.children[2].textContent).to.equal('PRODUCT ARRANGEMENT CODE: creative_cloud_all_apps_with_2tb_cloud_services_individual');
    expect(offerDetailsList.children[3].textContent).to.equal('PRICE POINT: INDIV_CCES_COM_2TB');
    expect(offerDetailsList.children[4].textContent).to.equal('CUSTOMER SEGMENT: INDIVIDUAL');
    expect(offerDetailsList.children[5].textContent).to.equal('COMMITMENT: YEAR');
    expect(offerDetailsList.children[6].textContent).to.equal('TERM: MONTHLY');
    expect(offerDetailsList.children[7].textContent).to.equal('OFFER SELECTOR IDS: Mutn1LYoGojkrcMdCLO7LQlx1FyTHw27ETsfLv0h8DQ');
    expect(offerDetailsList.children[8].textContent).to.equal('PRICE: $10');
    expect(offerDetailsList.children[9].textContent).to.equal('Checkout link');
  });
});

describe('decorateSearch', () => {
  it('decorates search input correctly', async () => {
    const el = document.createElement('div');
    await init(el);
    const searchWrapper = el.querySelector('.offer-search-wrapper');
    const offerDetailsWrapper = el.querySelector('.offer-details-wrapper');
    expect(searchWrapper).to.exist;
    expect(offerDetailsWrapper).to.exist;
    const input = searchWrapper.querySelector('.offer-search');
    expect(input).to.exist;
    expect(input.getAttribute('placeholder')).to.equal('Enter offer URL to preview');
  });
});
