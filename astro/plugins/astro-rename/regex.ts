export const RE_CLASS_HTML = /class\s*=\s*(["'])([^"']+?)\1/g;

export const RE_VAR_DEF = /(^|[^\w-])--([\w-]+)(?=\s*:)/g;
export const RE_VAR_REF = /(,?\s*var\(\s*--)([\w-]+)(,\s*var.+)?/g;

export const RE_VAR_REF_HTML_ATTR =
  /[^\s"'></=\p{C}]+\s*=\s*(["'])((?:(?!\1).)*var\(\s*--[\w-]+(?:(?!\1).)+)\1/gu;

export const RE_VAR_REF_HTML_ATTR_NO_QUOTE =
  /[^\s"'></=\p{C}]+\s*=\s*(var\(--[\w-]+(,\s*var.+)?\))[\s>]/gu;

export const RE_VAR_DEF_HTML_ATTR =
  /[^\s"'></=\p{C}]+\s*=\s*(["'])((?:(?!\1).)*--[\w-]+(?=\s*:)(?:(?!\1).)+)\1/gu;

export const RE_VAR_REF_JS = /(['"`])--([\w-]+)\1/g;
