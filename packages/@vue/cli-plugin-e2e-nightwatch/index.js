module.exports = (api, options) => {
  api.registerCommand('e2e', {
    description: 'run e2e tests with nightwatch',
    usage: 'vue-cli-service e2e [options]',
    options: {
      '--url': 'run e2e tests against given url instead of auto-starting dev server',
      '-e, --env': 'specify comma-delimited browser envs to run in (default: chrome)',
      '-t, --test': 'sepcify a test to run by name',
      '-f, --filter': 'glob to filter tests by filename'
    },
    details:
      `All Nightwatch CLI options are also supported.\n` +
      `https://github.com/nightwatchjs/nightwatch/blob/master/lib/runner/cli/cli.js`
  }, (args, rawArgs) => {
    if (args.url) {
      const i = rawArgs.findIndex(arg => /^--url/.test(arg))
      rawArgs = rawArgs.splice(i, 2)
    }

    const serverPromise = args.url
      ? Promise.resolve({ url: args.url })
      : api.service.run('serve', { mode: 'production' })

    return serverPromise.then(({ server, url }) => {
      // expose dev server url to tests
      process.env.VUE_DEV_SERVER_URL = url
      // expose user options to config file
      process.env.VUE_NIGHTWATCH_USER_OPTIONS = JSON.stringify(options.nightwatch || {})

      rawArgs.push('--config', require.resolve('./nightwatch.config.js'))
      if (rawArgs.indexOf('--env') === -1) {
        rawArgs.push('--env', 'chrome')
      }

      const execa = require('execa')
      const nightWatchBinPath = require.resolve('nightwatch/bin/nightwatch')
      const runner = execa(nightWatchBinPath, rawArgs, { stdio: 'inherit' })
      if (server) {
        runner.on('exit', () => server.close())
        runner.on('error', () => server.close())
      }

      if (process.env.VUE_CLI_TEST) {
        runner.on('exit', code => {
          process.exit(code)
        })
      }

      return runner
    })
  })
}
