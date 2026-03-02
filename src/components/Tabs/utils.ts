export const strToId = (str: string) =>
  str.toLocaleLowerCase().trim().replace(/\s/g, '-');

export const getTabIds = (title: string) => ({
  tabId: strToId(title) + '-tab',
  contentId: strToId(title) + '-tabpanel',
});
