// Currency formatter that adapts to region settings
// You can change 'currency' and 'locale' based on user settings or region
export const formatCurrency = (value: number | string, currency: string = 'INR', locale: string = 'en-IN') => {
  const numValue = Number(value);
  if (isNaN(numValue)) return value;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0, // Set to 2 if you always want decimals
    maximumFractionDigits: 2,
  }).format(numValue);
};
