const core = require('@actions/core');
const exec = require('@actions/exec');
const path = require('path');


async function get_output(command, ...args) {
  let output;
  const opts = {
    listeners: { stdout: (data) => { output += data.toString(); } }
  };
  await exec.exec(command, args, opts);
  return output;
}


function get_pkg_name() {
  let result = core.getInput('name');
  if (!result) {
    const output = get_output('conan', 'inspect', '.', '--raw', 'name').trim();
    result = 'None' != output ? output : '' ;
  }
  return result;
}


function get_pkg_version() {
  let result = core.getInput('version');
  if (!result) {
    const output
      = get_output('conan', 'inspect', '.', '--raw', 'version').trim();
    result = 'None' != output ? output : '' ;
  }
  return result;
}


function get_pkg_user() {
  let result = core.getInput('user');

  if (!result) { result = process.env['CONAN_USERNAME'].trim(); }

  if (!result) {
    const output
      = get_output('conan', 'inspect', '.', '--raw', 'default_user').trim();
    result = 'None' != output ? output : '' ;
  }

  if (!result) {
    const repo = process.env['GITHUB_REPOSITORY'] || '';
    result = (repo.split('/', 1) || [''])[0].trim();
  }

  return result;
}


function get_default_channel() {
  const output
    = get_output('conan', 'inspect', '.', '--raw', 'default_channel').trim();
  return 'None' != output ? output : '' ;
}


function get_pkg_channel() {
  let result = core.getInput('channel');

  if (!result) {
    const stable_channel
      = process.env['CONAN_STABLE_CHANNEL'].trim()
      || 'stable';
    const testing_channel
      = process.env['CONAN_CHANNEL'].trim()
      || get_default_channel()
      || 'testing';

    const git_ref = process.env['GITHUB_REF'].split('/', 2)[2].trim();
    const stable_pattern
      = process.env['CONAN_STABLE_BRANCH_PATTERN'].trim()
      || '^(master$|release.*|stable.*)';

    result = ref_name.match(stable_pattern) ? stable_channel : testing_channel;
  }

  return result;
}


function get_pkg_reference() {
  let result = core.getInput('reference');
  if (!result) {
    const name = get_pkg_name();
    const version = get_pkg_version();
    const channel = get_pkg_channel();
    const user = get_pkg_user();
    result = `${name}/${version}@${user}/${channel}`
  }
  return result;
}


function get_conan_home() {
  let result = process.env['CONAN_USER_HOME'].trim()
  if (!result) {
    if ('win32' == process.platform || 'win64' == process.platform) {
      conan_home = process.env['HOMEDRIVE'] + process.env['HOMEPATH']
    } else {
      conan_home = process.env['HOME']
    }
  }
  return result;
}


function run() {
  const pkg_reference = get_pkg_reference();
  console.log(`Using full package reference ${pkg_reference}`);

  const conan_home = get_conan_home();
  console.log(`Using Conan HOME ${conan_home}`);

  const location
    = path.join(
        conan_home,
      '.conan',
      'data',
      pkg_reference.replace('@', path.sep),
      'package');
  core.setOutput('path', location);
}

run()
