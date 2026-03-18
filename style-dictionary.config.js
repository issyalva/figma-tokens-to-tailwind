import StyleDictionary from "style-dictionary";

const BASE_FONT_SIZE_PX = 16;
const TOKEN_PROFILE = process.env.TOKEN_PROFILE || "generic";

// Namespace segments dropped from generated utility keys.
const STRIP_SEGMENTS = new Set(["m3"]);
const SKIP_TYPOGRAPHY_PROPS = new Set([
  "textDecoration",
  "fontStyle",
  "fontStretch",
  "textCase",
  "paragraphSpacing",
  "paragraphIndent",
  "fontFamily",
]);

function sanitizeCssName(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function normalizeColorKey(path) {
  const joined = path.map(sanitizeCssName).join("-");

  if (TOKEN_PROFILE === "material") {
    return joined
      .replace(/^color-[a-z0-9]+-sys-light-/, "")
      .replace(/^color-[a-z0-9]+-sys-dark-/, "dark-")
      .replace(/^color-[a-z0-9]+-/, "")
      .replace(/^color-/, "");
  }

  return joined.replace(/^color-/, "");
}

function getTypographyKey(path) {
  const typographyIndex = path.indexOf("typography");
  if (typographyIndex === -1 || path.length < typographyIndex + 3) {
    return null;
  }

  return path
    .slice(typographyIndex + 1, -1)
    .filter((s) => !STRIP_SEGMENTS.has(s.toLowerCase()))
    .join("-")
    .toLowerCase();
}

function isScalarToken(token) {
  return typeof token.value !== "object" || token.value === null;
}

function appendSection(css, title, rows) {
  if (rows.length === 0) return css;
  let next = `${css}  /* ${title} */\n`;
  rows.forEach((row) => {
    next += `${row}\n`;
  });
  next += "\n";
  return next;
}

function shadowToCss(v) {
  return `${v.offsetX}px ${v.offsetY}px ${v.radius}px ${v.spread}px ${v.color}`;
}

// Combine layered custom-shadow tokens into elevation-level CSS shadows.
function buildShadowGroups(tokens) {
  const groups = new Map();

  for (const token of tokens) {
    if (token.type !== "custom-shadow" || typeof token.value !== "object")
      continue;
    const rawMode = token.path[2] ?? "";
    const level = token.path[3] ?? "";
    if (!level) continue;
    const modeKey = rawMode.includes("dark") ? "dark-" : "";
    const groupKey = `${modeKey}elevation-${level}`;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(shadowToCss(token.value));
  }

  return groups;
}

function shadowRows(tokens) {
  const rows = [];
  const shadowGroups = buildShadowGroups(tokens);
  for (const [key, parts] of shadowGroups) {
    rows.push(`  --shadow-${key}: ${parts.join(", ")};`);
  }
  return rows;
}

StyleDictionary.registerTransform({
  name: "color/removeAlpha",
  type: "value",
  filter: (token) => token.type === "color",
  transform: (token) => {
    const val = token.value;
    if (typeof val === "string" && /^#[0-9a-fA-F]{6}[fF]{2}$/.test(val)) {
      return val.substring(0, 7);
    }
    return val;
  },
});

StyleDictionary.registerTransform({
  name: "size/pxToRem",
  type: "value",
  transitive: true,
  filter: (token) => {
    if (token.type !== "dimension" || typeof token.value !== "number")
      return false;
    // Keep letterSpacing in px for readability.
    return token.path[token.path.length - 1] !== "letterSpacing";
  },
  transform: (token) => `${token.value / BASE_FONT_SIZE_PX}rem`,
});

StyleDictionary.registerTransform({
  name: "name/cssVar",
  type: "name",
  transform: (token) => token.path.map(sanitizeCssName).join("-").toLowerCase(),
});

function buildCssVariablesOutput(dictionary) {
  let css = "/**\n * Generated design tokens\n * Do not edit directly\n */\n\n";
  css += ":root {\n";

  dictionary.allTokens.forEach((token) => {
    if (!isScalarToken(token)) return;
    css += `  --${token.name}: ${token.value};\n`;
  });

  const shadow = shadowRows(dictionary.allTokens);
  css = appendSection(css, "Elevation shadows", shadow);

  css += "}\n";
  return css;
}

// Collect rows once, then write them in stable section order.
function collectTailwindThemeRows(dictionary) {
  const rows = {
    colors: [],
    fontSize: [],
    fontWeight: [],
    lineHeight: [],
    letterSpacing: [],
  };

  dictionary.allTokens.forEach((token) => {
    if (!isScalarToken(token)) return;

    if (token.type === "color") {
      rows.colors.push(
        `  --color-${normalizeColorKey(token.path)}: ${token.value};`,
      );
      return;
    }

    const prop = token.path[token.path.length - 1];
    const key = getTypographyKey(token.path);
    if (!key) return;

    if (prop === "fontSize") {
      rows.fontSize.push(`  --font-size-${key}: ${token.value};`);
    } else if (prop === "fontWeight") {
      rows.fontWeight.push(`  --font-weight-${key}: ${token.value};`);
    } else if (prop === "lineHeight") {
      rows.lineHeight.push(`  --line-height-${key}: ${token.value};`);
    } else if (prop === "letterSpacing") {
      rows.letterSpacing.push(`  --letter-spacing-${key}: ${token.value};`);
    }
  });

  return rows;
}

function buildTailwindThemeOutput(dictionary) {
  const rows = collectTailwindThemeRows(dictionary);

  let css =
    "/**\n * Generated Tailwind @theme tokens\n * Do not edit directly\n */\n\n@theme {\n";

  css = appendSection(css, "Colors", rows.colors);
  css = appendSection(css, "Font sizes", rows.fontSize);
  css = appendSection(css, "Font weights", rows.fontWeight);
  css = appendSection(css, "Line heights", rows.lineHeight);
  css = appendSection(css, "Letter spacing", rows.letterSpacing);
  css = appendSection(
    css,
    "Elevation shadows",
    shadowRows(dictionary.allTokens),
  );

  css += "}\n";
  return css;
}

StyleDictionary.registerFormat({
  name: "css/variables",
  format: ({ dictionary }) => buildCssVariablesOutput(dictionary),
});

StyleDictionary.registerFormat({
  name: "tailwind/theme",
  format: ({ dictionary }) => buildTailwindThemeOutput(dictionary),
});

const config = {
  source: ["tokens/figma-tokens.json"],
  platforms: {
    css: {
      transforms: ["name/cssVar", "color/removeAlpha", "size/pxToRem"],
      buildPath: "tokens/build/",
      files: [
        {
          destination: "tokens.css",
          format: "css/variables",
          filter: (token) =>
            typeof token.value !== "object" ||
            token.value === null ||
            token.type === "custom-shadow",
        },
        {
          destination: "tailwind.theme.css",
          format: "tailwind/theme",
          filter: (token) => {
            if (token.type === "custom-shadow") return true;
            if (!isScalarToken(token)) return false;
            const isTypography = token.path.includes("typography");
            if (isTypography) {
              const prop = token.path[token.path.length - 1];
              if (SKIP_TYPOGRAPHY_PROPS.has(prop)) return false;
            }
            return token.type === "color" || isTypography;
          },
        },
      ],
    },
  },
};

export default config;
