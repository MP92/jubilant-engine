const getDataAttrParams = (element: HTMLElement, dataAttrSelector: string) =>
  JSON.parse(
    element.getAttribute(dataAttrSelector.replace(/(^\[|]$)/g, '')) ?? '{}',
  );

export default getDataAttrParams;
