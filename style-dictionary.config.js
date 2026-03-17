import StyleDictionary from "style-dictionary";

const BASE_FONT_SIZE_PX = 16;
const TOKEN_PROFILE = process.env.TOKEN_PROFILE || "generic";

// Design-system namespace segments to strip from keys (e.g. "m3" in M3 tokens)
const STRIP_SEGMENTS = new Set(["m3"]);

function sanitizeCssName(str) {
  // Lowercase first, then replace whitespace with hyphens, then strip
  // any remaining characters that are not valid in CSS custom property names.
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function normalizeColorKey(path) {
  const joined = path.map(sanitizeCssName).join("-").toLowerCase();

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

// Compose a CSS box-shadow string from a custom-shadow token value object
function shadowToCss(v) {
  return `${v.offsetX}px ${v.offsetY}px ${v.radius}px ${v.spread}px ${v.color}`;
}

// Group custom-shadow tokens by elevation mode + level → combined box-shadow string
function buildShadowGroups(tokens) {
  const groups = new Map();

  for (const token of tokens) {
    if (token.type !== "custom-shadow" || typeof token.value !== "object")
      continue;
    // path: ['effect', 'm3', 'elevation light' | 'elevation dark', '1'-'5', '0'|'1']
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
    // Letter spacing stays in px — converting tiny values to rem hurts readability
    return token.path[token.path.length - 1] !== "letterSpacing";
  },
  transform: (token) => `${token.value / BASE_FONT_SIZE_PX}rem`,
});

StyleDictionary.registerTransform({
  name: "name/cssVar",
  type: "name",
  transform: (token) => token.path.map(sanitizeCssName).join("-").toLowerCase(),
});

StyleDictionary.registerFormat({
  name: "css/variables",
  format: ({ dictionary }) => {
    let css =
      "/**\n * Generated design tokens\n * Do not edit directly\n */\n\n";
    css += ":root {\n";

    // Simple scalar tokens
    dictionary.allTokens.forEach((token) => {
      if (typeof token.value === "object" && token.value !== null) return;
      css += `  --${token.name}: ${token.value};\n`;
    });

    // Composed elevation shadows
    const shadowGroups = buildShadowGroups(dictionary.allTokens);
    if (shadowGroups.size > 0) {
      css += "\n  /* Elevation shadows */\n";
      for (const [key, parts] of shadowGroups) {
        css += `  --shadow-${key}: ${parts.join(", ")};\n`;
      }
    }

    css += "}\n";
    return css;
  },
});

StyleDictionary.registerFormat({
  name: "tailwind/theme",
  format: ({ dictionary }) => {
    const colors = [];
    const fontSize = [];
    const fontWeight = [];
    const lineHeight = [];
    const letterSpacing = [];

    dictionary.allTokens.forEach((token) => {
      if (typeof token.value === "object" && token.value !== null) return;

      if (token.type === "color") {
        colors.push({ key: normalizeColorKey(token.path), value: token.value });
        return;
      }

      const prop = token.path[token.path.length - 1];

      if (prop === "fontSize") {
        const key = getTypographyKey(token.path);
        if (key) fontSize.push({ key, value: token.value });
      } else if (prop === "fontWeight") {
        const key = getTypographyKey(token.path);
        if (key) fontWeight.push({ key, value: token.value });
      } else if (prop === "lineHeight") {
        const key = getTypographyKey(token.path);
        if (key) lineHeight.push({ key, value: token.value });
      } else if (prop === "letterSpacing") {
        const key = getTypographyKey(token.path);
        if (key) letterSpacing.push({ key, value: token.value });
      }
    });

    // Build shadow groups from custom-shadow tokens
    const shadowGroups = buildShadowGroups(dictionary.allTokens);

    let css =
      "/**\n * Generated Tailwind @theme tokens\n * Do not edit directly\n */\n\n@theme {\n";

    if (colors.length > 0) {
      css += "  /* Colors */\n";
      colors.forEach(({ key, value }) => {
        css += `  --color-${key}: ${value};\n`;
      });
      css += "\n";
    }

    if (fontSize.length > 0) {
      css += "  /* Font sizes */\n";
      fontSize.forEach(({ key, value }) => {
        css += `  --font-size-${key}: ${value};\n`;
      });
      css += "\n";
    }

    if (fontWeight.length > 0) {
      css += "  /* Font weights */\n";
      fontWeight.forEach(({ key, value }) => {
        css += `  --font-weight-${key}: ${value};\n`;
      });
      css += "\n";
    }

    if (lineHeight.length > 0) {
      css += "  /* Line heights */\n";
      lineHeight.forEach(({ key, value }) => {
        css += `  --line-height-${key}: ${value};\n`;
      });
      css += "\n";
    }

    if (letterSpacing.length > 0) {
      css += "  /* Letter spacing */\n";
      letterSpacing.forEach(({ key, value }) => {
        css += `  --letter-spacing-${key}: ${value};\n`;
      });
      css += "\n";
    }

    if (shadowGroups.size > 0) {
      css += "  /* Elevation shadows */\n";
      for (const [key, parts] of shadowGroups) {
        css += `  --shadow-${key}: ${parts.join(", ")};\n`;
      }
      css += "\n";
    }

    css += "}\n";
    return css;
  },
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
            if (typeof token.value === "object" && token.value !== null)
              return false;
            const isTypography = token.path.includes("typography");
            // Skip typography properties that have no useful CSS variation
            if (isTypography) {
              const prop = token.path[token.path.length - 1];
              const SKIP_PROPS = new Set([
                "textDecoration",
                "fontStyle",
                "fontStretch",
                "textCase",
                "paragraphSpacing",
                "paragraphIndent",
                "fontFamily", // single value (Roboto), omit unless needed
              ]);
              if (SKIP_PROPS.has(prop)) return false;
            }
            return token.type === "color" || isTypography;
          },
        },
      ],
    },
  },
};

export default config;
