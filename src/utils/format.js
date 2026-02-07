export const fmt = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

export function priceLabel(price, currency) {
  if (!price && price !== 0) {
    return "--";
  }
  const suffix = currency ? ` ${currency}` : "";
  return `${fmt.format(price)}${suffix}`;
}

export function dateLabel(value) {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

export function fullDateLabel(value) {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  return date.toLocaleString();
}

export function getDomain(url) {
  if (!url) {
    return "";
  }
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (error) {
    return "";
  }
}
