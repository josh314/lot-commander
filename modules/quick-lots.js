const boilerplate = [
  {
    handlePrefix: 'GM',
    name: 'General Merchandise',
    template: {
      type: 'shelf-pull',
      totalUnits: 400,
      listingData: {
        title: 'Brand Name General Merchandise Variety',
        body: 'The lot contains electronics, toys, games, housewares, kitchen items, everyday items and more.'
      },
    }
  },
  {
    handlePrefix: 'GM',
    name: 'General Merchandise',
    template: {
      type: 'customer returns',
      totalUnits: 400,
      listingData: {
        title: 'Brand Name General Merchandise Variety',
        body: 'The lot contains electronics, toys, games, housewares, kitchen items, everyday items and more.'
      },
    }
  },
  {
    handlePrefix: 'CS',
    name: 'Cosmetics',
    template: {
      type: 'shelf-pull',
      totalUnits: 400,
      listingData: {
        title: 'Brand Name Cosmetics Variety',
        body: 'Cosmetics, Maybelline & L\'Oreal Foundation, Lip, Eye & Face Makeup'
          + '\n'
          + '\nItems included:'
          + '\nFoundation, Lipstick, Mascara, Eyeliner, Browliner, Eyeshadow and more.'
      },
    }
  },
  {
    handlePrefix: 'CS',
    name: 'Cosmetics',
    template: {
      type: 'salvage',
      totalUnits: 400,
      listingData: {
        title: 'Brand Name Cosmetics Variety',
        body: 'Cosmetics, Maybelline & L\'Oreal Foundation, Lip, Eye & Face Makeup'
          + '\n'
          + '\nItems included:'
          + '\nFoundation, Lipstick, Mascara, Eyeliner, Browliner, Eyeshadow and more.'
      },
    }
  },
  {
    handlePrefix: 'VT',
    name: 'Vitamins & Supplements',
    template: {
      type: 'salvage',
      totalUnits: 400,
      listingData: {
        title: 'Brand Name Vitamins & Supplements Variety',
        body: 'Huge variety of brand name vitamins.'
          + '\n'
          + '\nName brands include:'
          + '\nC-4'
          + '\nAlli'
          + '\nSam-E'
          + '\nNature Made'
          + '\nMP Assault'
          + '\nCentrum'
          + '\nSun Down Emergen C and more'
      },
    }
  },
  {
    handlePrefix: 'PC',
    name: 'Personal Care',
    template: {
      type: 'shelf-pull',
      totalUnits: 400,
      listingData: {
        title: 'Brand Name Personal Care Variety',
        body: 'Large lot of brand name health & beauty products from a national retail drugstore.'
      },
    }
  },
  {
    handlePrefix: 'PC',
    name: 'Personal Care',
    template: {
      type: 'customer returns',
      totalUnits: 400,
      listingData: {
        title: 'Brand Name Personal Care Variety',
        body: 'Large lot of brand name health & beauty products from a national retail drugstore.'
      },
    }
  },
  {
    handlePrefix: 'NP',
    name: 'Nail Polish',
    template: {
      type: 'shelf-pull',
      totalUnits: 400,
      listingData: {
        title: 'Brand Name Nail Polish Variety',
        body: 'Popular Brand Name Nail Polish Variety'
          + '\n'
          + '\nThe lot includes a huge variety of nail polishes that have been pulled from a retail environment.'
          + '\n'
          + '\nThe brands include:'
          + '\nRevlon'
          + '\nMaybelline'
          + '\nCoverGirl'
          + '\nL’Oreal'
          + '\nEssie'
          + '\nOPI'
          + '\nand more'
      },
    }
  },
];

module.exports = {
  boilerplate: boilerplate,
}