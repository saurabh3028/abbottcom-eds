import fs from 'fs';
import path from 'path';
import postcss from 'postcss';

const spectrumCSSPath = path.resolve('node_modules/@spectrum-css/tokens/dist/index.css');
const miloCSSPath = path.resolve('../../deps/spectrum2-styles.css');

const spectrumCSS = fs.readFileSync(spectrumCSSPath, 'utf8');
const miloCSS = fs.readFileSync(miloCSSPath, 'utf8');

// Formats and transforms Spectrum CSS Rgb and opacity properties into one value
const transformRgbProperties = (rule) => {
  const propertiesToUpdate = {};

  const replaceZeroPx = (value) => value.replace(/\b0px\b/g, '0');

  rule.walkDecls((decl) => {
    const { prop, value } = decl;

    decl.value = replaceZeroPx(value);

    if (prop.endsWith('-rgb')) {
      const baseName = prop.replace('-rgb', '');
      propertiesToUpdate[baseName] = `rgb(${value.replace(/,\s*/g, ' ')})`;
      decl.remove();
    }

    if (prop.endsWith('-opacity')) {
      const baseName = prop.replace('-opacity', '');
      if (propertiesToUpdate[baseName]) {
        const opacityPercent = parseFloat(value) * 100;
        propertiesToUpdate[baseName] = propertiesToUpdate[baseName].replace(')', ` / ${opacityPercent}%)`);
      } else {
        propertiesToUpdate[baseName] = `rgb(0 0 0 / ${value})`; // Placeholder if no corresponding -rgb is found
      }
      decl.remove();
    }
  });

  Object.keys(propertiesToUpdate).forEach((prop) => {
    rule.append({ prop, value: propertiesToUpdate[prop] });
  });
};

const extractAndTransformCustomProperties = (css) => {
  const customProperties = {};
  postcss.parse(css).walkRules((rule) => {
    const { selector } = rule;
    if (!customProperties[selector]) {
      customProperties[selector] = {};
    }

    transformRgbProperties(rule);

    rule.walkDecls((decl) => {
      customProperties[selector][decl.prop] = decl.value;
    });
  });
  return customProperties;
};

const spectrumCustomProperties = extractAndTransformCustomProperties(spectrumCSS);
const miloCustomProperties = extractAndTransformCustomProperties(miloCSS);

const mergedCustomProperties = {};

const allSelectors = Object.keys(miloCustomProperties);

allSelectors.forEach((selector) => {
  mergedCustomProperties[selector] = { ...miloCustomProperties[selector] };

  if (spectrumCustomProperties[selector]) {
    Object.keys(miloCustomProperties[selector]).forEach((prop) => {
      if (spectrumCustomProperties[selector][prop] !== undefined) {
        mergedCustomProperties[selector][prop] = spectrumCustomProperties[selector][prop];
      }
    });
  }
});

const updateCustomPropertiesInMiloCSS = (css) => {
  const root = postcss.parse(css);

  root.walkRules((rule) => {
    const { selector } = rule;
    if (mergedCustomProperties[selector]) {
      rule.walkDecls((decl) => {
        const { prop } = decl;
        if (mergedCustomProperties[selector][prop] !== undefined) {
          decl.value = mergedCustomProperties[selector][prop];
        }
      });
    }
  });

  return root.toString();
};

const updatedCustomCSS = updateCustomPropertiesInMiloCSS(miloCSS);

fs.writeFileSync(miloCSSPath, updatedCustomCSS, 'utf8');
console.log(`Updated custom properties written to ${miloCSSPath}`);
