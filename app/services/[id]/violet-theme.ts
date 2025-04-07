// Violet theme functions for business details page

// Define the promotion type to match BusinessDetails
type Promotion = {
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isFirstTimeOnly: boolean;
  validUntil: string;
  isActive: boolean;
};

// Function to generate a gradient color based on service name
const getServiceGradient = (serviceName: string, index: number): string => {
  // Always return violet gradient regardless of index
  return 'from-violet-50 to-white border-violet-100/50';
};

// Function to get icon background color based on service name
const getIconBackground = (serviceName: string, index: number): string => {
  // Always return violet background regardless of index
  return 'bg-violet-100 text-violet-600 group-hover:bg-violet-200';
};

// Function to get text color based on service name
const getTextColor = (serviceName: string, index: number): string => {
  // Always return violet text color regardless of index
  return 'text-violet-700 group-hover:text-violet-800';
};

// Function to generate a gradient color based on feature
const getFeatureGradient = (feature: string, index: number): string => {
  // Always return violet gradient regardless of index
  return 'from-violet-50 to-white border-violet-100/50';
};

// Function to get icon background color based on feature
const getFeatureIconBg = (feature: string, index: number): string => {
  // Always return violet background regardless of index
  return 'bg-violet-100 text-violet-600';
};

// Function to generate a gradient color based on promotion
const getPromotionGradient = (promotion: Promotion | undefined, index: number): string => {
  // Always return violet gradient regardless of index
  return 'from-violet-50 to-white border-violet-100/50';
};

// Function to get icon background color based on promotion
const getPromotionIconBg = (promotion: Promotion | undefined, index: number): string => {
  // Always return violet background regardless of index
  return 'bg-violet-100 text-violet-600';
};

// Function to get text color based on promotion
const getPromotionTextColor = (promotion: Promotion | undefined, index: number): string => {
  // Always return violet text color regardless of index
  return 'text-violet-700 group-hover:text-violet-800';
};

export {
  getServiceGradient,
  getIconBackground,
  getTextColor,
  getFeatureGradient,
  getFeatureIconBg,
  getPromotionGradient,
  getPromotionIconBg,
  getPromotionTextColor
}; 