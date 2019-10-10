const core = require('@actions/core');
const exec = require('@actions/exec');
const path = require('path');

function get_env(name) { return (process.env[name] || '').trim(); }

async function get_output(command, ...args) {
  let output = '';
  const opts = {
    listeners : {stdout : (data) => { output += data.toString(); }}
  };
  await exec.exec(command, args, opts);

  output = output.trim();
  return 'None' != output ? output : '';
}

async function inspect_pkg(attr) {
  return await get_output('conan', 'inspect', '.', '--raw', attr);
}

async function get_input_or_pkg_attr(attr) {
  let result = core.getInput(attr);
  if (!result) {
    result = await inspect_pkg(attr);
  }
  return result;
}

async function get_pkg_user() {
  let result = core.getInput('user');

  if (!result) { result = get_env('CONAN_USERNAME'); }

  if (!result) { result = await inspect_pkg('default_user'); }

  if (!result) {
    const repo = get_env('GITHUB_REPOSITORY');
    result = (repo.split('/', 1) || [ '' ])[0].trim();
  }

  return result;
}

async function get_pkg_channel() {
  let result = core.getInput('channel');

  if (!result) { result = get_env('CONAN_CHANNEL'); }

  if (!result) { result = await inspect_pkg('default_channel'); }

  if (!result) { result = 'testing'; }

  return result;
}

async function get_pkg_reference() {
  let result = core.getInput('reference');
  if (!result) {
    const name = await get_input_or_pkg_attr('name');
    const version = await get_input_or_pkg_attr('version');
    const user = await get_pkg_user();
    const channel = await get_pkg_channel();
    result = `${name}/${version}@${user}/${channel}`
  }
  return result;
}

function get_conan_home() {
  let result = get_env('CONAN_CHANNEL');
  if (!result) {
    if ('win32' == process.platform || 'win64' == process.platform) {
      result = process.env['HOMEDRIVE'] + process.env['HOMEPATH']
    } else {
      result = process.env['HOME']
    }
  }
  return result;
}

async function run() {
  const pkg_reference = await get_pkg_reference();
  console.log()
  console.log(`Using full package reference ${pkg_reference}`);

  const conan_home = get_conan_home();
  console.log(`Using Conan HOME ${conan_home}`);

  const location = path.join(conan_home, '.conan', 'data',
                             pkg_reference.replace('@', path.sep), 'package');
  core.setOutput('path', location);
}

run()
