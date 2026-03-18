const TYPOGRAPHY_SAMPLE_TEXT = "Typography token sample";
const ELEVATION_KEYS = [
  "elevation-1",
  "elevation-2",
  "elevation-3",
  "elevation-4",
  "elevation-5",
  "dark-elevation-1",
  "dark-elevation-2",
  "dark-elevation-3",
  "dark-elevation-4",
  "dark-elevation-5",
];

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

function renderSummary(
  colorVars,
  typographyVars,
  elevationCount,
  letterSpacingVars,
) {
  const summary = document.querySelector("#token-summary");
  if (!summary) {
    return;
  }

  summary.innerHTML = [
    `<span class="token-pill text-body-medium leading-body-medium">${colorVars.length} color tokens</span>`,
    `<span class="token-pill text-body-medium leading-body-medium">${typographyVars.length} typography tokens</span>`,
    `<span class="token-pill text-body-medium leading-body-medium">${letterSpacingVars.length} letter-spacing tokens</span>`,
    `<span class="token-pill text-body-medium leading-body-medium">${elevationCount} elevation tokens</span>`,
    '<span class="token-pill text-body-medium leading-body-medium">Build source: tokens/figma-tokens.json</span>',
  ].join("");
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

  return Array.from(scaleMap.entries())
    .map(([name, values]) => ({
      name,
      values,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function formatTypographyName(rawName) {
  const cleaned = rawName.replace(/^m3-/, "");
  return cleaned
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
      const letterSpacing = values.letterspacing || "normal";
      const displayName = formatTypographyName(name);

      return `
        <div class="typography-row py-4">
          <p class="text-body-large leading-body-large" style="font-size:${escapeHtml(fontSize)}; line-height:${escapeHtml(lineHeight)}; font-weight:${escapeHtml(fontWeight)}; letter-spacing:${escapeHtml(letterSpacing)};">
            ${escapeHtml(displayName)}
          </p>
          <p class="mt-2 text-body-medium leading-body-medium" style="font-size:${escapeHtml(fontSize)}; line-height:${escapeHtml(lineHeight)}; font-weight:${escapeHtml(fontWeight)}; letter-spacing:${escapeHtml(letterSpacing)};">
            ${TYPOGRAPHY_SAMPLE_TEXT}
          </p>
          <p class="mt-3 text-body-medium leading-body-medium">
            Size ${escapeHtml(fontSize)} · Line height ${escapeHtml(lineHeight)} · Weight ${escapeHtml(fontWeight)} · Letter spacing ${escapeHtml(letterSpacing)}
          </p>
        </div>
      `;
    })
    .join("");
}

function renderLetterSpacing(letterSpacingVars) {
  const list = document.querySelector("#letter-spacing-list");
  if (!list) return;

  // Only show light-scale slots (non-emphasized) to keep the panel concise
  const filtered = letterSpacingVars.filter(
    (t) => !t.name.includes("-emphasized"),
  );

  if (filtered.length === 0) {
    list.innerHTML =
      '<p class="text-body-medium leading-body-medium">No letter-spacing tokens found.</p>';
    return;
  }

  list.innerHTML = filtered
    .map((token) => {
      const key = token.name.replace(/^--letter-spacing-/, "");
      const utility = `tracking-${key}`;
      return `
        <div class="typography-row py-4">
          <p class="text-body-medium leading-body-medium" style="letter-spacing:${escapeHtml(token.value)};">
            ${TYPOGRAPHY_SAMPLE_TEXT}
          </p>
          <p class="mt-2 text-body-medium leading-body-medium">${escapeHtml(utility)} - ${escapeHtml(token.value)}</p>
        </div>
      `;
    })
    .join("");
}

function getElevationLabel(key) {
  const pretty = key
    .replace(/^dark-/, "Dark ")
    .replace("elevation-", "Elevation ");
  return pretty
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getElevationSamples() {
  return ELEVATION_KEYS.map((key) => {
    const variable = `--shadow-${key}`;
    const utility = `shadow-${key}`;
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(variable)
      .trim();
    return {
      key,
      variable,
      label: getElevationLabel(key),
      utility,
      value,
    };
  }).filter((sample) => sample.value && sample.value !== "none");
}

function getElevationLevel(sample) {
  const match = sample.key.match(/(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function renderElevation(elevationSamples) {
  const grid = document.querySelector("#elevation-grid");
  const strip = document.querySelector("#elevation-strip");
  if (!grid || !strip) return;

  if (elevationSamples.length === 0) {
    const empty =
      '<p class="text-body-medium leading-body-medium">No elevation tokens found.</p>';
    grid.innerHTML = empty;
    strip.innerHTML = empty;
    return;
  }

  const lightSamples = elevationSamples
    .filter((sample) => !sample.key.startsWith("dark-"))
    .sort((a, b) => getElevationLevel(a) - getElevationLevel(b));

  grid.innerHTML = elevationSamples
    .map((sample) => {
      return `
        <article class="elevation-card swatch rounded-2xl p-5">
          <div class="elevation-sample rounded-xl" style="box-shadow:${escapeHtml(sample.value)};"></div>
          <p class="mt-4 text-label-large font-label-large">${escapeHtml(sample.label)}</p>
          <p class="mt-1 text-body-medium leading-body-medium">${escapeHtml(sample.variable)}</p>
          <p class="mt-2 text-body-medium leading-body-medium">${escapeHtml(sample.value)}</p>
        </article>
      `;
    })
    .join("");

  strip.innerHTML = lightSamples
    .map(
      (sample) => `
        <article class="elevation-strip-item rounded-2xl p-4">
          <div class="elevation-sample rounded-xl" style="box-shadow:${escapeHtml(sample.value)};"></div>
          <p class="mt-3 text-label-large font-label-large">${escapeHtml(sample.label)}</p>
        </article>
      `,
    )
    .join("");
}

function renderMapping(colorVars, typographyVars, elevationSamples) {
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

  const shadowRows = elevationSamples.map((sample) => ({
    token: sample.variable,
    utility: sample.utility,
    value: sample.value,
  }));

  const rows = [...colorRows, ...typographyRows, ...shadowRows]
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
  const letterSpacingVars = getCssVariables("--letter-spacing-");
  const elevationSamples = getElevationSamples();

  renderSummary(
    colorVars,
    typographyVars,
    elevationSamples.length,
    letterSpacingVars,
  );
  renderTypography(typographyVars);
  renderLetterSpacing(letterSpacingVars);
  renderElevation(elevationSamples);
  renderMapping(colorVars, typographyVars, elevationSamples);
  initializeThemeToggle(colorVars);
}

bootShowcase();
