const fs=require("fs");const h=fs.readFileSync(require("path").join(__dirname,"../../index.html"),"utf8");
const src=h.slice(h.indexOf("// LOGIC START"),h.indexOf("// LOGIC END"));
module.exports=new Function(src+";return {RULES,Logic};")();
