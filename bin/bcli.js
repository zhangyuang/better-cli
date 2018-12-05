#!/usr/bin/env node

const program = require('commander')
const download = require('download-git-repo')
const inquirer = require('inquirer')
const fs = require('fs')
const nunjucks = require('nunjucks')
const exec = require('child_process').exec
const ora = require('ora')
const chalk = require('chalk')
const symbols = require('log-symbols')

function processError (err) {
  if (err) {
    console.log(symbols.error, chalk.red('项目创建失败'), err)
    throw err
  }
}

function processPackageJson (name, params) {
  // 根据模版生成package.json文件
  try {
    renderTpl(`${name}/package.tpl`, `${name}/package.json`, params)
  } catch (error) {
    processError(error)
  }
}

function processWebpack (name, params) {
  // 根据模版生成webpack配置文件
  try {
    renderTpl(`${name}/cmd/webpack.base.conf.tpl`, `${name}/cmd/webpack.base.conf.js`, params)
  } catch (error) {
    processError(error)
  }
}

async function processDirectory (name) {
  try {
    // 文件夹已存在
    fs.accessSync(name)
    const Delete = await inquirer.prompt([
      {
        name: 'delete',
        message: '当前目录已存在，是否删除 yes(y) or no(n)'
      }
    ])
    const isDelete = /y(es)?/i.test(Delete.delete)
    return isDelete
  } catch (error) {
    // 文件夹不存在
    return true
  }
}

function processVueFiles (name, params) {
  renderTpl(`${name}/src/app-page/App.tpl`, `${name}/src/app-page/App.vue`, params) // App.vue文件模版
  renderTpl(`${name}/src/app-page/index.js.tpl`, `${name}/src/app-page/index.js`, params) // App.vue文件模版
  renderTpl(`${name}/.babelrc.tpl`, `${name}/.babelrc`, params) // babel文件模版
  if (!params.installRouter) {
    exec(`rm -rf ${name}/src/app-page/router ${name}/src/app-apge/compontes/foo.vue ${name}/src/app-apge/compontes/bar.vue`)
  }
}

function renderTpl (beforePath, afterPath, params) {
  const content = fs.readFileSync(beforePath).toString()
  const result = nunjucks.compile(content).render(params)
  fs.writeFileSync(afterPath, result)
  exec(`rm -rf ${beforePath}`)
}
program
  .version('1.0.0', '-v', '--version')
  .command('init <name>')
  .action(async name => {
    const isDelete = await processDirectory(name)
    if (!isDelete) {
      return
    }
    // 下载vue-with-router这个分支的代码
    const answers = await inquirer.prompt([
      {
        name: 'projectName',
        message: '请输入项目名称'
      },
      {
        name: 'author',
        message: '请输入作者名称'
      },
      {
        name: 'router',
        message: '是否安装vue-router yes(y) or no(n)'
      },
      {
        name: 'eslint',
        message: '是否安装eslint yes(y) or no(n)'
      }
    ])
    const installRouter = /y(es)?/i.test(answers.router)
    const installEslint = /y(es)?/i.test(answers.eslint)
    answers.installEslint = installEslint
    const spinner = ora('正在下载模板...')
    spinner.start()
    exec(`rm -rf ${name}`, err => {
      processError(err)
      const downloadUrl = 'https://github.com:zhangyuang/webpackTpl#vue'
      download(downloadUrl, name, {clone: true}, err => {
        spinner.succeed()
        processError(err)
        processPackageJson(name, Object.assign(answers, {
          installRouter: installRouter
        }))
        processWebpack(name, {
          installEslint: installEslint
        })
        processVueFiles(name, {
          installRouter: installRouter
        })
        console.log(symbols.success, chalk.green('项目创建成功'))
      })
    })
  })
program.parse(process.argv)
