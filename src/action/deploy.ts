// inputs
// required:
// - deploy token
// optional:
// - environment (defaults to production)
// - branch name (current branch default)
// - deploy script (defaults to `0 deploy` or can take a package script name)
// - add pr comment after deploy

import * as core from '@actions/core';
import exec from '@actions/exec';
import github from '@actions/github';
import getDeployURLs from '../utils/deployOutput';
import { getPackageManager, getPackage } from '../utils/packageManager';

export default async function deploy(): Promise<void> {
  try {
    // set the deploy token to the env from user's input
    const $deploy_token = core.getInput('token');
    core.setSecret($deploy_token);
    process.env['LAYER0_DEPLOY_TOKEN'] = $deploy_token;

    const deployCmd = [];

    const { execCmd, runCmd } = await getPackageManager();
    const pkg = await getPackage();

    // if a 'edgio:deploy' script is defined, use this instead of default deploy command
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

    const options = {
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
    await exec.exec(deployCmd[0], deployCmd.slice(1), options);

    // set deploy URLs to output for following steps
    const urls = getDeployURLs(deployOutput);
    if (urls) {
      for (let key in urls) {
        core.setOutput(key, urls[key]);
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}