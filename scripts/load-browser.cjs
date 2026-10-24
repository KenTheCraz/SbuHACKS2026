const fs=require('node:fs'),vm=require('node:vm');module.exports=function(path,name){const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path,'utf8'),ctx);return ctx[name]};
