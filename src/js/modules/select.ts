import BaseComponent from './generic/BaseComponent';
import {
  querySelectorRequired,
  querySelectorAllRequired,
} from '../utils/querySelectors';
import MatchMedia from '@/js/MatchMedia';

const selectors = {
  root: '[data-js-select]',
  origSelect: '[data-js-select-orig-control]',
  button: '[data-js-select-btn]',
  dropdown: '[data-js-select-dropdown]',
  option: '[data-js-select-option]',
};

const stateClasses = {
  isExpanded: 'is-expanded',
  isSelected: 'is-selected',
  isCurrent: 'is-current',
  isOnTheLeftSide: 'left',
  isOnTheRightSide: 'right',
};

type SelectState = {
  expanded: boolean;
  currentOptionIndex: number | null;
  selectedOption: HTMLElement | null;
};

class Select extends BaseComponent<SelectState> {
  protected readonly origSelect: HTMLSelectElement;
  protected readonly button: HTMLElement;
  protected readonly dropdown: HTMLElement;
  protected readonly options: HTMLElement[];

  constructor(rootEl: HTMLElement) {
    super(rootEl, {
      expanded: false,
      currentOptionIndex: null,
      selectedOption: null,
    });

    this.origSelect = querySelectorRequired<HTMLSelectElement>(
      selectors.origSelect,
      rootEl,
    );

    this.button = querySelectorRequired(selectors.button, rootEl);

    this.dropdown = querySelectorRequired(selectors.dropdown, rootEl);

    this.options = querySelectorAllRequired(selectors.option, this.dropdown);

    this.init();

    setTimeout(this.fixDropdownPosition, 500);
  }

  private fixDropdownPosition = () => {
    const viewportWidth = document.documentElement.clientWidth;
    const viewportCenterX = viewportWidth / 2;
    const { width, x } = this.button.getBoundingClientRect();
    const buttonCenterX = x + width / 2;
    const isButtonOnTheLeftViewportSide = buttonCenterX < viewportCenterX;

    this.dropdown.classList.toggle(
      stateClasses.isOnTheLeftSide,
      isButtonOnTheLeftViewportSide,
    );

    this.dropdown.classList.toggle(
      stateClasses.isOnTheRightSide,
      !isButtonOnTheLeftViewportSide,
    );
  };

  private init() {
    this.updateState({
      currentOptionIndex: this.origSelect.selectedIndex,
      selectedOption: this.options[this.origSelect.selectedIndex],
    });

    this.updateTabIndexes();

    MatchMedia.mobile.addEventListener('change', (event) =>
      this.updateTabIndexes(event.matches),
    );

    this.origSelect.addEventListener('change', () =>
      this.updateState({
        expanded: false,
        selectedOption: this.options[this.origSelect.selectedIndex],
      }),
    );

    this.button.addEventListener(
      'click',
      () => (this.state.expanded = !this.state.expanded),
    );

    this.addOptionsClickListener();

    this.addOutsideClickListener();

    this.initNavigation();
  }

  private addOptionsClickListener() {
    this.dropdown.addEventListener('click', (event) => {
      const { target } = event;

      const optionSelected = (target as HTMLElement)?.matches(selectors.option);

      if (optionSelected) {
        this.updateState({
          expanded: false,
          selectedOption: target as HTMLElement,
          currentOptionIndex: this.options.findIndex(
            (optionEl) => optionEl === target,
          ),
        });
      }
    });
  }

  private addOutsideClickListener() {
    document.addEventListener('click', (event) => {
      const { target } = event;

      const isButtonClick = target === this.button;
      const isOutsideDropdownClick =
        (target as HTMLElement)?.closest(selectors.dropdown) !== this.dropdown;

      if (!isButtonClick && isOutsideDropdownClick) {
        this.state.expanded = false;
      }
    });
  }

  private initNavigation() {
    this.rootEl.addEventListener('keydown', (event) => {
      const { code } = event;

      const action = {
        ArrowUp: this.toPrevOption,
        ArrowDown: this.toNextOption,
        Space: this.selectCurrentOption,
        Enter: this.selectCurrentOption,
        Escape: () => (this.state.expanded = false),
      }[code];

      if (action) {
        event.preventDefault();
        action();
      }
    });
  }

  private isNeedToExpand() {
    const isButtonFocused = document.activeElement === this.button;

    return !this.state.expanded && isButtonFocused;
  }

  private selectCurrentOption = () => {
    if (this.isNeedToExpand()) {
      this.state.expanded = true;
      return;
    }

    this.state.selectedOption = this.options[this.state.currentOptionIndex!];
    this.state.expanded = false;
  };

  private toPrevOption = () => {
    const prevOptionIndex =
      (this.state.currentOptionIndex! > 0
        ? this.state.currentOptionIndex!
        : this.options.length) - 1;

    this.setCurrentOption(prevOptionIndex);
  };

  private toNextOption = () => {
    const nextOptionIndex =
      this.state.currentOptionIndex! + 1 < this.options.length
        ? this.state.currentOptionIndex! + 1
        : 0;

    this.setCurrentOption(nextOptionIndex);
  };

  private setCurrentOption = (optionIndex: number) => {
    if (this.isNeedToExpand()) {
      this.state.expanded = true;
      return;
    }

    this.state.currentOptionIndex = optionIndex;
  };

  private updateTabIndexes(isMobileDevice = MatchMedia.mobile.matches) {
    this.origSelect.tabIndex = isMobileDevice ? 0 : -1;
    this.button.tabIndex = isMobileDevice ? -1 : 0;
  }

  protected updateUI(): void {
    const newSelectedOptionValue = (
      this.state.selectedOption?.textContent ?? ''
    ).trim();

    this.origSelect.value = newSelectedOptionValue;

    this.updateButton(newSelectedOptionValue);

    this.dropdown.classList.toggle(
      stateClasses.isExpanded,
      this.state.expanded,
    );

    this.updateOptions();
  }

  private updateButton(newSelectedOptionValue: string) {
    this.button.textContent = newSelectedOptionValue;
    this.button.classList.toggle(stateClasses.isExpanded, this.state.expanded);
    this.button.ariaExpanded = this.state.expanded + '';
    this.button.setAttribute(
      'aria-activedescendant',
      this.options[this.state.currentOptionIndex!].id,
    );
  }

  private updateOptions() {
    this.options.forEach((optionEl, index) => {
      const isCurrent = this.state.currentOptionIndex === index;
      const isSelected = this.state.selectedOption === optionEl;

      optionEl.classList.toggle(stateClasses.isCurrent, isCurrent);
      optionEl.classList.toggle(stateClasses.isSelected, isSelected);
      optionEl.ariaSelected = isSelected + '';
    });
  }
}

class SelectCollection {
  constructor() {
    document
      .querySelectorAll<HTMLElement>(selectors.root)
      .forEach((el: HTMLElement) => new Select(el));
  }
}

export default SelectCollection;
