export const formatPrice = (price, priceType = 'fixed') => {
  if (price === 0 || priceType === 'free') {
    return 'Free';
  }

  const numPrice = Number(price) || 0;
  const formattedNum = `₦${numPrice.toLocaleString()}`;

  switch (priceType) {
    case 'hourly':
      return `${formattedNum} / hr`;
    case 'starting-at':
      return `From ${formattedNum}`;
    case 'negotiable':
      return formattedNum;
    default:
      return formattedNum;
  }
};
