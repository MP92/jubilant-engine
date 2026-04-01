import { slugify } from '@/js/utils/slugify';

export const getTabIds = (title: string) => ({
  tabId: slugify(title) + '-tab',
  contentId: slugify(title) + '-tabpanel',
});
