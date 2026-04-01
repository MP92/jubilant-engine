import { querySelectorRequired } from '../utils/querySelectors';
import isVisibleInViewport from '../utils/isVisibleInViewport';

const TRANSITION_DURATION_MS = 400;

const selectors = {
  root: '[data-js-accordion]',
  details: '[data-js-accordion-details]',
  summary: '[data-js-accordion-summary]',
};

function accordion() {
  const accordionElements = document.querySelectorAll<HTMLElement>(
    selectors.root,
  );

  accordionElements.forEach((accordionEl) => {
    const details = querySelectorRequired<HTMLDetailsElement>(
      selectors.details,
      accordionEl,
    );
    const summary = querySelectorRequired<HTMLElement>(
      selectors.summary,
      accordionEl,
    );

    details.addEventListener('toggle', () => {
      summary.setAttribute('aria-expanded', details.open ? 'true' : 'false');

      if (details.open) {
        setTimeout(() => {
          if (!isVisibleInViewport(details)) {
            accordionEl.scrollIntoView();
          }
        }, TRANSITION_DURATION_MS + 100);
      }
    });
  });
}

export default accordion;
