const GUIDE_PLACES_CATALOG = [
  { code: 'HANUMAN_TAL', name: 'Hanuman Tal', price: 200 },
  { code: 'GUPT_BHIMASHANKAR', name: 'Gupt Bhimashankar', price: 200 },
  { code: 'BOMBAY_POINT', name: 'Bombay Point', price: 100 },
  { code: 'NAGPHANI_POINT', name: 'Nagphani Point', price: 200 },
  { code: 'BHIMA_RIVER_ORIGIN', name: 'Bhima River Origination Point', price: 100 }
];

const normalizePlaceCode = (value = '') =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_');

const getGuidePlaceByCode = (code) => {
  const key = normalizePlaceCode(code);
  return GUIDE_PLACES_CATALOG.find((item) => item.code === key) || null;
};

const buildGuidePlacesFromCodes = (codes) => {
  const list = Array.isArray(codes) ? codes : [];
  const unique = [...new Set(list.map(normalizePlaceCode).filter(Boolean))];
  if (unique.length === 0) {
    return { places: [], totalAmount: 0 };
  }

  const places = unique.map((code) => {
    const found = getGuidePlaceByCode(code);
    if (!found) {
      const err = new Error(`Invalid place code: ${code}`);
      err.code = 'INVALID_PLACE';
      throw err;
    }
    return {
      code: found.code,
      name: found.name,
      price: Number(found.price) || 0
    };
  });

  const totalAmount = places.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
  return { places, totalAmount };
};

module.exports = {
  GUIDE_PLACES_CATALOG,
  normalizePlaceCode,
  getGuidePlaceByCode,
  buildGuidePlacesFromCodes
};

