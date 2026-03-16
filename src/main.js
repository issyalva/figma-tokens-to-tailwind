const PRIORITY_COLOR_PARTS = [
  "primary",
  "surface",
  "secondary",
  "tertiary",
  "brand",
  "accent",
  "outline",
];
const TYPOGRAPHY_SAMPLE_TEXT = "Typography token sample";

function getCssVariables(prefix) {
  const style = getComputedStyle(document.documentElement);
  const vars = [];

  for (const name of style) {
    if (!name.startsWith(prefix)) {
      continue;
    }

    const value = style.getPropertyValue(name).trim();
    if (!value) {
      continue;
    }

    vars.push({ name, value });
  }

  return vars;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function hexToRgb(value) {
  const hex = value.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(hex)) {
    return null;
  }

  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : hex;
  const int = Number.parseInt(normalized, 16);

  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function getReadableTextColor(colorValue) {
  const rgb = hexToRgb(colorValue);
  if (!rgb) {
    return "#111111";
  }

  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance > 0.58 ? "#101828" : "#f8fafc";
}

function pickShowcaseColors(colorVars) {
  const used = new Set();
  const prioritized = [];

  for (const keyPart of PRIORITY_COLOR_PARTS) {
    const match = colorVars.find(
      (token) => token.name.includes(keyPart) && !used.has(token.name),
    );
    if (match) {
      used.add(match.name);
      prioritized.push(match);
    }
  }

  for (const token of colorVars) {
    if (prioritized.length >= 6) {
      break;
    }
    if (used.has(token.name)) {
      continue;
    }
    used.add(token.name);
    prioritized.push(token);
  }

  return prioritized.slice(0, 6);
}

function createAltColor(name, value) {
  if (
    name.includes("onsurface") ||
    name.includes("on-primary") ||
    name.includes("onprimary")
  ) {
    return `color-mix(in srgb, ${value} 70%, #0f352f 30%)`;
  }

  if (name.includes("surface") || name.includes("background")) {
    return `color-mix(in srgb, ${value} 72%, #f0fffb 28%)`;
  }

  if (
    name.includes("outline") ||
    name.includes("stroke") ||
    name.includes("border")
  ) {
    return `color-mix(in srgb, ${value} 78%, #3a8a7c 22%)`;
  }

  return `color-mix(in srgb, ${value} 68%, #0ea290 32%)`;
}

function applyAltTheme(colorVars, enabled) {
  for (const token of colorVars) {
    if (enabled) {
      document.body.style.setProperty(
        token.name,
        createAltColor(token.name, token.value),
      );
      continue;
    }

    document.body.style.removeProperty(token.name);
  }
}

function renderSummary(colorVars, typographyVars) {
  const summary = document.querySelector("#token-summary");
  if (!summary) {
    return;
  }

  summary.innerHTML = [
    `<span class="token-pill text-body-medium leading-body-medium">${colorVars.length} color tokens</span>`,
    `<span class="token-pill text-body-medium leading-body-medium">${typographyVars.length} typography tokens</span>`,
    '<span class="token-pill text-body-medium leading-body-medium">Build source: tokens/figma-tokens.json</span>',
  ].join("");
}

function renderSwatches(colorVars) {
  const swatchesGrid = document.querySelector("#swatches-grid");
  if (!swatchesGrid) {
    return;
  }

  const swatches = pickShowcaseColors(colorVars);
  if (swatches.length === 0) {
    swatchesGrid.innerHTML =
      '<article class="swatch rounded-2xl border p-5"><p class="text-body-medium leading-body-medium">No color tokens found.</p></article>';
    return;
  }

  swatchesGrid.innerHTML = swatches
    .map((token) => {
      const utility = token.name.replace(/^--color-/, "");
      const textColor = getReadableTextColor(token.value);
      return `
        <article class="swatch rounded-2xl border p-5" style="background:${escapeHtml(token.value)}; color:${textColor};">
          <p class="text-label-large font-label-large">${escapeHtml(token.name)}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <span class="swatch-chip text-body-medium leading-body-medium">bg-${escapeHtml(utility)}</span>
            <span class="swatch-chip text-body-medium leading-body-medium">text-${escapeHtml(utility)}</span>
          </div>
          <p class="mt-3 text-body-medium leading-body-medium">${escapeHtml(token.value)}</p>
        </article>
      `;
    })
    .join("");
}

function typographyScales(typographyVars) {
  const scaleMap = new Map();

  for (const token of typographyVars) {
    const parts = token.name.replace(/^--typography-/, "").split("-");
    const kind = parts.pop();
    const key = parts.join("-");

    if (!scaleMap.has(key)) {
      scaleMap.set(key, {});
    }

    scaleMap.get(key)[kind] = token.value;
  }

  return Array.from(scaleMap.entries()).map(([name, values]) => ({
    name,
    values,
  }));
}

function renderTypography(typographyVars) {
  const list = document.querySelector("#typography-list");
  if (!list) {
    return;
  }

  const scales = typographyScales(typographyVars);
  if (scales.length === 0) {
    list.innerHTML =
      '<p class="text-body-medium leading-body-medium">No typography tokens found.</p>';
    return;
  }

  list.innerHTML = scales
    .map(({ name, values }) => {
      const fontSize = values.fontsize || "1rem";
      const lineHeight = values.lineheight || "1.3";
      const fontWeight = values.fontweight || "400";

      return `
        <p class="text-body-medium leading-body-medium" style="font-size:${escapeHtml(fontSize)}; line-height:${escapeHtml(lineHeight)}; font-weight:${escapeHtml(fontWeight)};">
          <span class="font-label-large text-label-large">${escapeHtml(name)}:</span>
          ${TYPOGRAPHY_SAMPLE_TEXT} (${escapeHtml(fontSize)} / ${escapeHtml(lineHeight)} / ${escapeHtml(fontWeight)})
        </p>
      `;
    })
    .join("");
}

function renderMapping(colorVars, typographyVars) {
  const body = document.querySelector("#mapping-body");
  if (!body) {
    return;
  }

  const colorRows = colorVars.map((token) => {
    const utility = token.name.replace(/^--color-/, "");
    return {
      token: token.name,
      utility: `bg-${utility} / text-${utility}`,
      value: token.value,
    };
  });

  const typographyRows = typographyVars.map((token) => {
    const utilityKey = token.name
      .replace(/^--typography-/, "")
      .replace(/-(fontsize|lineheight|fontweight)$/, "");
    const kind = token.name.endsWith("fontsize")
      ? `text-${utilityKey}`
      : token.name.endsWith("lineheight")
        ? `leading-${utilityKey}`
        : `font-${utilityKey}`;

    return {
      token: token.name,
      utility: kind,
      value: token.value,
    };
  });

  const rows = [...colorRows, ...typographyRows]
    .slice(0, 24)
    .map(
      ({ token, utility, value }) => `
        <tr class="token-row">
          <td class="px-6 py-4 text-body-medium leading-body-medium">${escapeHtml(token)}</td>
          <td class="px-6 py-4 text-body-medium leading-body-medium">${escapeHtml(utility)}</td>
          <td class="px-6 py-4 text-body-medium leading-body-medium">${escapeHtml(value)}</td>
        </tr>
      `,
    )
    .join("");

  body.innerHTML = rows;
}

function initializeThemeToggle(colorVars) {
  const toggle = document.querySelector("#theme-toggle");
  if (!toggle) {
    return;
  }

  toggle.addEventListener("click", () => {
    const isAlt = document.body.dataset.theme === "alt";
    if (isAlt) {
      delete document.body.dataset.theme;
      applyAltTheme(colorVars, false);
      toggle.textContent = "Switch to alt theme";
      toggle.setAttribute("aria-pressed", "false");
      return;
    }

    document.body.dataset.theme = "alt";
    applyAltTheme(colorVars, true);
    toggle.textContent = "Switch to base theme";
    toggle.setAttribute("aria-pressed", "true");
  });
}

function bootShowcase() {
  const colorVars = getCssVariables("--color-");
  const typographyVars = getCssVariables("--typography-");

  renderSummary(colorVars, typographyVars);
  renderSwatches(colorVars);
  renderTypography(typographyVars);
  renderMapping(colorVars, typographyVars);
  initializeThemeToggle(colorVars);
}

bootShowcase();
