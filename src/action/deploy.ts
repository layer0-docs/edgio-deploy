// inputs
// required:
// - deploy token
// optional:
// - environment (defaults to production)
// - branch name (current branch default)
// - deploy script (defaults to `0 deploy` or can take a package script name)
// - add pr comment after deploy

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import github from '@actions/github';
import checkEnvironment from '../utils/checkEnvironment';
import getDeployURLs from '../utils/deployOutput';
import { getPackageManager, getPackage } from '../utils/packageManager';

export default async function deploy(): Promise<void> {
  checkEnvironment();

  try {
    // set the deploy token to the env from user's input
    const $deploy_token = core.getInput('token');
    core.setSecret($deploy_token);
    process.env['LAYER0_DEPLOY_TOKEN'] = $deploy_token;

    const deployCmd = [];

    const { execCmd, runCmd } = await getPackageManager();
    const pkg = await getPackage();

    // if a 'edgio:deploy' script is defined, use this instead of default deploy command
    //@ts-ignore
    const customDeployCmd = pkg.scripts?.['edgio:deploy'];

    if (customDeployCmd) {
      deployCmd.push(runCmd);
      deployCmd.push(customDeployCmd);
    } else {
      deployCmd.push(execCmd);
      deployCmd.push('0 deploy');
    }

    let deployOutput = '';
    let deployError = '';

    const options: exec.ExecOptions = {
      listeners: {
        stdout: (data: Buffer) => {
          deployOutput += data.toString();
        },
        stderr: (data: Buffer) => {
          deployError += data.toString();
        },
      },
    };

    // execute the deploy
    core.info(`deploy command:  ${deployCmd[0]} ${deployCmd.slice(1)}`);
    await exec.exec(deployCmd.join(' '), [], options);

    // // set deploy URLs to output for following steps
    // const urls = getDeployURLs(deployOutput);
    // if (urls) {
    //   for (let key in urls) {
    //     core.setOutput(key, urls[key]);
    //   }
    // }
  } catch (error) {
    //@ts-ignore
    core.setFailed(error.message);
  }
}
