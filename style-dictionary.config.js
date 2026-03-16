import StyleDictionary from 'style-dictionary';

const BASE_FONT_SIZE_PX = 16;
const TOKEN_PROFILE = process.env.TOKEN_PROFILE || 'generic';

function normalizeColorKey(path) {
  const joined = path.join('-').toLowerCase();

  if (TOKEN_PROFILE === 'material') {
    return joined
      .replace(/^color-[a-z0-9]+-sys-light-/, '')
      .replace(/^color-[a-z0-9]+-sys-dark-/, 'dark-')
      .replace(/^color-[a-z0-9]+-/, '')
      .replace(/^color-/, '');
  }

  return joined.replace(/^color-/, '');
}

function getTypographyKey(path) {
  const typographyIndex = path.indexOf('typography');
  if (typographyIndex === -1 || path.length < typographyIndex + 3) {
    return null;
  }

  return path.slice(typographyIndex + 1, -1).join('-').toLowerCase();
}

StyleDictionary.registerTransform({
  name: 'color/removeAlpha',
  type: 'value',
  filter: (token) => token.type === 'color',
  transform: (token) => {
    const val = token.value;
    if (typeof val === 'string' && /^#[0-9a-fA-F]{6}[fF]{2}$/.test(val)) {
      return val.substring(0, 7);
    }
    return val;
  },
});

StyleDictionary.registerTransform({
  name: 'size/pxToRem',
  type: 'value',
  transitive: true,
  filter: (token) => token.type === 'dimension' && typeof token.value === 'number',
  transform: (token) => `${token.value / BASE_FONT_SIZE_PX}rem`,
});

StyleDictionary.registerTransform({
  name: 'name/cssVar',
  type: 'name',
  transform: (token) => token.path.join('-').toLowerCase().replace(/\s+/g, '-'),
});

StyleDictionary.registerFormat({
  name: 'css/variables',
  format: ({ dictionary }) => {
    let css = '/**\n * Generated design tokens\n * Do not edit directly\n */\n\n';
    css += ':root {\n';
    dictionary.allTokens.forEach((token) => {
      css += `  --${token.name}: ${token.value};\n`;
    });
    css += '}\n';
    return css;
  },
});

StyleDictionary.registerFormat({
  name: 'tailwind/theme',
  format: ({ dictionary }) => {
    const colors = [];
    const fontSize = [];
    const fontWeight = [];
    const lineHeight = [];

    dictionary.allTokens.forEach((token) => {
      if (typeof token.value === 'object' && token.value !== null) {
        return;
      }

      if (token.type === 'color') {
        colors.push({ key: normalizeColorKey(token.path), value: token.value });
      }

      if (token.path[token.path.length - 1] === 'fontSize') {
        const key = getTypographyKey(token.path);
        if (key) {
          fontSize.push({ key, value: token.value });
        }
      }

      if (token.path[token.path.length - 1] === 'fontWeight') {
        const key = getTypographyKey(token.path);
        if (key) {
          fontWeight.push({ key, value: token.value });
        }
      }

      if (token.path[token.path.length - 1] === 'lineHeight') {
        const key = getTypographyKey(token.path);
        if (key) {
          lineHeight.push({ key, value: token.value });
        }
      }
    });

    let css = '/**\n * Generated Tailwind @theme tokens\n * Do not edit directly\n */\n\n@theme {\n';

    if (colors.length > 0) {
      css += '  /* Colors */\n';
      colors.forEach(({ key, value }) => {
        css += `  --color-${key}: ${value};\n`;
      });
      css += '\n';
    }

    if (fontSize.length > 0) {
      css += '  /* Font sizes */\n';
      fontSize.forEach(({ key, value }) => {
        css += `  --font-size-${key}: ${value};\n`;
      });
      css += '\n';
    }

    if (fontWeight.length > 0) {
      css += '  /* Font weights */\n';
      fontWeight.forEach(({ key, value }) => {
        css += `  --font-weight-${key}: ${value};\n`;
      });
      css += '\n';
    }

    if (lineHeight.length > 0) {
      css += '  /* Line heights */\n';
      lineHeight.forEach(({ key, value }) => {
        css += `  --line-height-${key}: ${value};\n`;
      });
      css += '\n';
    }

    css += '}\n';
    return css;
  },
});

const config = {
  source: ['tokens/figma-tokens.json'],
  platforms: {
    css: {
      transforms: ['name/cssVar', 'color/removeAlpha', 'size/pxToRem'],
      buildPath: 'tokens/build/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          filter: (token) => typeof token.value !== 'object' || token.value === null,
        },
        {
          destination: 'tailwind.theme.css',
          format: 'tailwind/theme',
          filter: (token) => {
            const isSimpleValue = typeof token.value !== 'object' || token.value === null;
            const isTypography = token.path.includes('typography');
            return isSimpleValue && (token.type === 'color' || isTypography);
          },
        },
      ],
    },
  },
};

export default config;
