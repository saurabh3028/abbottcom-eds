const decorateSignIn = async ({ blockEl, decoratedEl, toFragment, getPlaceholder }) => {
  const dropDown = blockEl.querySelector(':scope > div:nth-child(2)');
  const signInLabel = await getPlaceholder('sign-in').then(({ value }) => value);
  if (!dropDown) {
    const signIn = toFragment`<a href="#" daa-ll="${signInLabel}" class="feds-signin">${signInLabel}</a>`;
    signIn.addEventListener('click', (e) => {
      e.preventDefault();
      window.adobeIMS.signIn();
    });
    return signIn;
  }

  const signInWithDropDown = toFragment`<a href="#" daa-ll="${signInLabel}" class="feds-signin" role="button" aria-expanded="false" aria-controls="navmenu-profile" daa-lh="header|Close" aria-haspopup="true">${signInLabel}</a>`;
  dropDown.classList.add('feds-signin-dropdown');
  decoratedEl.insertAdjacentElement('beforeend', dropDown);

  // TODO we don't have a good way of adding attributes to links
  const dropDownSignIn = dropDown.querySelector('[href="https://adobe.com?sign-in=true"]');
  if (dropDownSignIn) {
    dropDownSignIn.addEventListener('click', (e) => {
      e.preventDefault();
      window.adobeIMS.signIn();
    });
  }

  signInWithDropDown.addEventListener('click', () => window.dispatchEvent(new Event('feds:profileSignIn:clicked')));
  return signInWithDropDown;
};

export default decorateSignIn;
