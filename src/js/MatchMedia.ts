import pxToRem from './utils/pxToRem';

const MatchMedia = {
  mobile: window.matchMedia(`(width <= ${pxToRem(768)}rem)`),
};

export default MatchMedia;
