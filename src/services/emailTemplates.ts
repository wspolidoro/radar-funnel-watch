// Email HTML templates using generated sample images
import onboardingWelcome from '@/assets/email-samples/onboarding-welcome.png';
import educationTutorial from '@/assets/email-samples/education-tutorial.png';
import promoSale from '@/assets/email-samples/promo-sale.png';
import reengagement from '@/assets/email-samples/reengagement.png';
import seasonal from '@/assets/email-samples/seasonal.png';
import productShowcase from '@/assets/email-samples/product-showcase.png';

export const createEmailHTML = (imageSrc: string, alt: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
    }
    img {
      width: 100%;
      height: auto;
      display: block;
    }
  </style>
</head>
<body>
  <img src="${imageSrc}" alt="${alt}" />
</body>
</html>
`;

export const emailTemplates = {
  onboarding: createEmailHTML(onboardingWelcome, 'Onboarding Welcome Email'),
  education: createEmailHTML(educationTutorial, 'Educational Tutorial Email'),
  promo: createEmailHTML(promoSale, 'Promotional Sale Email'),
  reengagement: createEmailHTML(reengagement, 'Re-engagement Email'),
  seasonal: createEmailHTML(seasonal, 'Seasonal Holiday Email'),
  showcase: createEmailHTML(productShowcase, 'Product Showcase Email')
};
