const path = require('path')
const fs = require('fs')
const axios = require('axios')
const ora = require('ora')
const Inquirer = require('Inquirer')
const { promisify } = require('util')
let downloadGitRepo = require('download-git-repo')
//可以把异步的api转换为promise
downloadGitRepo = promisify(downloadGitRepo)
const { downloadDirectory } = require('./constants')
let ncp =require("ncp");
ncp = promisify(ncp);
const MetalSmith = require('metalsmith') //遍历文件夹 找需不需要渲染
//统一了所有的模板引擎
let { render } = require('consolidate').ejs
render = promisify(render)
// create功能是创建项目
// 拉取你自己的所有项目列出来 让用户选 安装哪个项目 projectName
// github api https://docs.github.com/en/rest
// 选完后 在显示所有的版本号 1.0

//https://api.github.com/orgs/feng-cli/repos 获取组织下的仓库

// 可能还需要用户配置一些数据 来结合渲染我的项目

const fetchRepoList = async () => {
  const { data } = await axios.get('https://api.github.com/orgs/feng-cli/repos');
  return data;
}

const fetchTagList = async (repo) => {
  const { data } = await axios.get(`https://api.github.com/repos/feng-cli/${repo}/tags`);
  return data;
}

// 封装Loading效果
// 高阶函数让传参更合理,柯力化思想，分开传参
const waitFnloading = (fn, message) => async (...args) => {
  const spinner = ora(message)
  spinner.start();
  let result = await fn(...args);
  spinner.succeed();
  return result;
}

const download = async (repo, tag) => {
  let api = `feng-cli/${repo}`
  if (tag) {
    api += `#${tag}`
  }
  // /user/xxxx/.template/repo
  const dist = `${downloadDirectory}/${repo}`
  await downloadGitRepo(api, dist)
  return dist; //下载的最终目录
}

module.exports = async (projectName) => {
  // 1) 获取项目的模板 fetchTagList
  let repos = await waitFnloading(fetchRepoList, 'fetching template ...')()
  repos = repos.map((item) => item.name)
  // 在获取之前 显示loading 之后关闭loading
  // 选择模板 inquirer
  const { repo } = await Inquirer.prompt({
    name: 'repo',
    type: 'list',
    message: 'please choose a template to create project',
    choices: repos,
  })

  // 通过当前选择的项目 拉取对应的版本
  // 获取对应的版本号
  let tags = await waitFnloading(fetchTagList, 'fetching tags ...')(repo)
  tags = tags.map((item) => item.name);
  const { tag } = await Inquirer.prompt({
    name: 'tag',
    type: 'list',
    message: 'please choose tags to create project',
    choices: tags,
  })

  //下载模板后把模板放到一个临时目录里 存好，以备后续使用，会有很多逻辑处理。缓存啦、编译啦。
  //download-git-repo
  const result = await waitFnloading(download, 'download template')(repo, tag)
  //我拿到了下载的目录 直接拷贝到当前执行的目录下即可 ncp

  //复杂的需要模板渲染 渲染后在拷贝
  //把template下的文件 拷贝到执行命令的目录下 并改名

  // 4）拷贝操作
  // 这个目录 项目名字是否已经存在 如果存在提示当前已经存在

  //如果有ask文件
  if(!fs.existsSync(path.join(result, 'ask.js'))) {
    await ncp(result, path.resolve(projectName));
    console.log('项目生成完毕',path.resolve(projectName));
  } else {
    // 复杂项目 把git上的项目下载下来，如果有ask文件 就是一个复杂的项目 需要用户选择 选择后编译模板
    // metalsmith 只要是编译 都需要这个模块
    // 1)让用户填信息
    // 2)用填写的信息去渲染模板
    await new Promise((resolve, reject) => {
      MetalSmith(__dirname) //如果你传入路径 默认会遍历当前路径下的src文件夹，需要遍历的不止SRC，但是不传内部会报错。
        .source(result)
        .destination(path.resolve(projectName))
        .use(async (files, metal, done) => {
          const args = require(path.join(result, 'ask.js'))
          let obj =  await Inquirer.prompt(args);
          const meta = metal.metadata()
          Object.assign(meta, obj);
          delete files['ask.js']
          done();
        })
        .use((files, metal, done) => {
          let obj = metal.metadata();
          Reflect.ownKeys(files).forEach(async (file) => {
            //这个是要处理的文件 <%
            if (file.includes('js') || file.includes('json')) {
              let content = files[file].contents.toString(); //文件的内容
              if (content.includes('<%')) {
                content = await render(content, obj)
                files[file].contents = Buffer.from(content); //渲染
              }
            }
          });
          done();
        })
        .build((err) => {
          if(err) {
            reject()
          } else {
            resolve()
            console.log('项目生成完毕',path.resolve(projectName));
          }
        })
    })
  }

//config install add .....
}
