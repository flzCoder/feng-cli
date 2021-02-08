//存放用户的所需要的常量
const { version } = require("../package.json")

//存模板的位置,一般放在根路径下 cd~ 隐藏文件.开头的
const downloadDirectory = `${process.env[process.platform === "darwin" ? "HOME" : "USERPROFILE"]}/.template`;
module.exports = {
  version,
  downloadDirectory,
}
