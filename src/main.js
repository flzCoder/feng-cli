// 找到要执行的核心文件
// 要解析用户的参数
const program = require('commander')
const path = require("path")
const { version } = require("./constants.js")

const mapActions = {
  create: {
    alias: 'c',
    description: 'create a project',
    examples: [
      'feng-cli create <project-name>',
    ],
  },
  config: {
    alias: 'conf',
    description: 'config project variable',
    examples: [
      'feng-cli config set <k> <v>',
      'feng-cli config get <k>',
    ],
  },
  '*': {
    alias: '',
    description: 'command not found',
    examples: [],
  }
}

Reflect.ownKeys(mapActions).forEach((action) => {
  program
    .command(action)
    .alias(mapActions[action].alias)
    .description(mapActions[action].description)
    .action(() => {
      if(action === "*") {
        console.log(mapActions[action].description);
      } else {
        require(path.resolve(__dirname, action))(...process.argv.slice(3));
      }
    })
});

program.on('--help', ()=>{
  console.log('\nExamples:');
  Reflect.ownKeys(mapActions).forEach((action) => {
    mapActions[action].examples.forEach((example) => {
      console.log(`  ${example}`);
    });
  })
})

//解析用户传递的参数
program.version(version).parse(process.argv);
