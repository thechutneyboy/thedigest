const colorMap = {
  "bbc.co.uk/sport": "#ffd230",
  "bbc.co.uk": "#b80000",
  "ft.com": "#fff1e5",
  "google.com": "#4285f4",
  "livemint.com": "#f99d1c",
  "nytimes.com": "#000000",
  "reddit.com": "#d93900",
  "theguardian.com": "#052962",
};

function getMatchingValueRegex(str, obj) {
  const regex = new RegExp(Object.keys(obj).join("|"), "i"); // Case-insensitive search
  const match = str.match(regex);
  return match ? obj[match[0]] : null;
}

function xmlToJson(xml) {
  let obj = {};

  if (xml.nodeType === 1) {
    // Element node
    if (xml.attributes.length > 0) {
      obj["@attributes"] = {};
      for (let attr of xml.attributes) {
        obj["@attributes"][attr.nodeName] = attr.nodeValue;
      }
    }
  } else if (xml.nodeType === 3) {
    // Text node
    return xml.nodeValue.trim();
  }

  if (xml.hasChildNodes()) {
    for (let child of xml.childNodes) {
      let nodeName = child.nodeName;
      let childData = xmlToJson(child);

      if (child.nodeType === 3 && !childData) continue; // Skip empty text nodes

      if (obj[nodeName] === undefined) {
        obj[nodeName] = childData;
      } else {
        if (!Array.isArray(obj[nodeName])) {
          obj[nodeName] = [obj[nodeName]];
        }
        obj[nodeName].push(childData);
      }
    }
  }

  return obj;
}

function getBestTextColor(bgColor) {
  // Convert HEX to RGB
  const hexToRgb = (hex) => {
    hex = hex.replace(/^#/, ""); // Remove # if present
    if (hex.length === 3)
      hex = hex
        .split("")
        .map((x) => x + x)
        .join(""); // Convert short hex (e.g., #fff) to full format
    const bigint = parseInt(hex, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  };

  // Calculate relative luminance
  const luminance = (r, g, b) => {
    const toLinear = (c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  };

  // Get RGB values
  const [r, g, b] = hexToRgb(bgColor);

  // Determine contrast
  return luminance(r, g, b) > 0.5 ? "#000000" : "#FFFFFF"; // Black text if light background, white text if dark background
}
