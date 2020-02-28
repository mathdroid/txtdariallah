// Key: {surah}.{ayat}
// Value: translation
const quran = require("./flat.json");

const flatAyats = Object.entries(quran);
const getRandomAyatFairly = () => {
  const [key, translation] = flatAyats[
    Math.floor(Math.random() * flatAyats.length)
  ];

  // flatAyats.find(a => a[0] === '96.1') # iqra

  const [surah, ayat] = key.split(".");
  return { surah, ayat, translation };
};

module.exports = { getRandomAyatFairly };
