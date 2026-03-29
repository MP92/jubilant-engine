export const getElementByIdRequired = (id: string) => {
  const element = document.getElementById(id);

  if (!element) {
    throw Error(`Element with id '${id}' not found.`);
  }

  return element;
};

export const querySelectorRequired = <T extends HTMLElement = HTMLElement>(
  selector: string,
  rootEl?: HTMLElement,
) => {
  const element = (rootEl ?? document).querySelector<T>(selector);

  if (!element) {
    throw Error(`Element '${selector}' not found.`);
  }

  return element;
};

export const querySelectorAllRequired = <T extends HTMLElement = HTMLElement>(
  selector: string,
  rootEl?: HTMLElement,
) => {
  const elements = (rootEl ?? document).querySelectorAll<T>(selector);

  if (!elements.length) {
    throw Error(`Elements '${selector}' not found.`);
  }

  return [...elements];
};
