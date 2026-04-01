import BaseComponent from './generic/BaseComponent';
import pxToRem from '../utils/pxToRem';
import getDataAttrParams from '../utils/getDataAttrParams';
import {
  getElementByIdRequired,
  querySelectorAllRequired,
  querySelectorRequired,
} from '../utils/querySelectors';

interface TabsOptions {
  navElementId?: string;
}

const selectors = {
  root: '[data-js-tabs]',
  navigation: '[data-js-tabs-navigation]',
  tabBtn: '[data-js-tabs-btn]',
  tabPanel: '[data-js-tabs-panel]',
};

const ACTIVE_CLASS = 'is-active';

const cssVars = {
  activeBtnOffset: '--tabs-navigation-active-btn-offset',
  activeBtnWidth: '--tabs-navigation-active-btn-width',
};

type TabsState = {
  activeTabIndex: number;
};

class Tabs extends BaseComponent<TabsState> {
  protected readonly navigation: HTMLElement;
  protected readonly tabButtons: HTMLButtonElement[] = [];
  protected readonly tabPanels: HTMLElement[] = [];

  constructor(rootEl: HTMLElement) {
    super(rootEl, {
      activeTabIndex: -1,
    });

    const { navElementId } = getDataAttrParams(
      this.rootEl,
      selectors.root,
    ) as TabsOptions;

    this.navigation = navElementId
      ? getElementByIdRequired(navElementId)
      : querySelectorRequired(selectors.navigation, this.rootEl);

    this.tabButtons = querySelectorAllRequired<HTMLButtonElement>(
      selectors.tabBtn,
      this.navigation,
    );
    this.tabPanels = querySelectorAllRequired(selectors.tabPanel, this.rootEl);

    this.init();
  }

  private findCurrentActiveTabIndex() {
    return Math.max(
      this.tabButtons.findIndex((tab) =>
        JSON.parse(tab.ariaSelected ?? 'false'),
      ),
      0,
    );
  }

  protected init() {
    setTimeout(() => {
      this.state.activeTabIndex = this.findCurrentActiveTabIndex();
    }, 200);

    this.tabButtons.forEach((tab, index) =>
      tab.addEventListener('click', () => (this.state.activeTabIndex = index)),
    );

    const resizeObserver = new ResizeObserver(() =>
      this.updateNavigationCSSVars(this.state.activeTabIndex),
    );
    resizeObserver.observe(this.navigation);
  }

  protected updateUI(): void {
    const { activeTabIndex } = this.state;

    if (activeTabIndex !== -1) {
      this.updateTabs(activeTabIndex);

      this.updateTabPanels(activeTabIndex);

      this.updateNavigationCSSVars(activeTabIndex);
    }
  }

  private updateTabs(activeTabIndex: number) {
    this.tabButtons.forEach((tabBtn, index) => {
      const isActive = index === activeTabIndex;

      tabBtn.classList.toggle(ACTIVE_CLASS, isActive);
      tabBtn.ariaSelected = isActive + '';
      tabBtn.tabIndex = isActive ? 0 : -1;
    });
  }

  private updateTabPanels(activeTabIndex: number) {
    this.tabPanels.forEach((tabPanel, index) => {
      const isActive = index === activeTabIndex;

      tabPanel.classList.toggle(ACTIVE_CLASS, isActive);
    });
  }

  private updateNavigationCSSVars(activeTabIndex: number) {
    if (activeTabIndex === -1) {
      return;
    }

    const { left: btnLeft, width: btnWidth } =
      this.tabButtons[activeTabIndex].getBoundingClientRect();
    const { left: navigationLeft } = this.navigation.getBoundingClientRect();

    const btnOffset = btnLeft - navigationLeft;

    this.navigation.style.setProperty(
      cssVars.activeBtnOffset,
      `${pxToRem(btnOffset)}rem`,
    );
    this.navigation.style.setProperty(
      cssVars.activeBtnWidth,
      `${pxToRem(btnWidth)}rem`,
    );
  }
}

class TabsWithNavigation extends Tabs {
  override init() {
    super.init();

    this.initNavigation();
  }

  private getMacOSNavigationAction = (metaKey: boolean, key: string) =>
    (metaKey &&
      {
        ArrowLeft: this.firstTab,
        ArrowRight: this.lastTab,
      }[key]) ||
    null;

  private getNavigationAction = (key: string) =>
    ({
      ArrowLeft: this.prevTab,
      ArrowRight: this.nextTab,
      Home: this.firstTab,
      End: this.lastTab,
    })[key];

  initNavigation() {
    document.addEventListener('keydown', (e) => {
      if (
        !this.rootEl.contains(e.target as HTMLElement) &&
        !this.tabButtons.some((tabBtn) => tabBtn === e.target)
      ) {
        return;
      }

      const { key, metaKey } = e;

      const action =
        this.getMacOSNavigationAction(metaKey, key) ??
        this.getNavigationAction(key);

      if (action) {
        e.preventDefault();
        action();
      }
    });
  }

  prevTab = () => {
    const prevTabIndex =
      (this.state.activeTabIndex > 0
        ? this.state.activeTabIndex
        : this.tabButtons.length) - 1;

    this.setActiveTab(prevTabIndex);
  };

  nextTab = () => {
    const nextTabIndex =
      this.state.activeTabIndex + 1 < this.tabButtons.length
        ? this.state.activeTabIndex + 1
        : 0;

    this.setActiveTab(nextTabIndex);
  };

  firstTab = () => {
    this.setActiveTab(0);
  };

  lastTab = () => {
    this.setActiveTab(this.tabButtons.length - 1);
  };

  setActiveTab = (newActiveTabIndex: number) => {
    this.state.activeTabIndex = newActiveTabIndex;
    this.tabButtons[newActiveTabIndex]?.focus();
  };
}

class TabsCollection {
  constructor() {
    document
      .querySelectorAll<HTMLElement>(selectors.root)
      .forEach((el: HTMLElement) => new TabsWithNavigation(el));
  }
}

export default TabsCollection;
