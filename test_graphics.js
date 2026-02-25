import fs from 'fs';
const content = fs.readFileSync("/Users/baotm/Desktop/td-pwa/chart/charting_library/charting_library.standalone.js", "utf8");
console.log(content.match(/graphics.{0,100}polygon/ig));
