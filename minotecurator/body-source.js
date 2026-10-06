// Supplied printed body boxes; other cards retain the blank paper box.
const printedBoxes = new Set([19,26,41,62,93,95,97,110,116,164,166,169,198,232,260,271,281,284,295,296,316,335,355,373,491,522,529,533,534,536,553,584,612,614,618,719,868,879,884,914,1135,1136,1139,1143,1163,1176,1192,1194,1196,1219,1224,1254,1260,1266,1269,1273,1275,1277,1296,1297,1298,1301,1302,1308,1315,1338,1402,1403,1406,1407,1412]);
export function bodySource(id) {
  return printedBoxes.has(Number(id)) ? `/minotecurator/assets/body-text/${Number(id)}.webp` : '/minotecurator/assets/body-crop.png';
}
