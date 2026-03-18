const fs=require('fs');
const lines=fs.readFileSync('frontend/pages/AccessControl.tsx','utf8').split('\n');
lines.forEach((line,i)= if(line.includes('openGrandAccess')) console.log(i+1,line); });
