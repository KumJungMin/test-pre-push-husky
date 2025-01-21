import * as fs from 'fs';
import { execSync, exec } from 'child_process';

export function getPushedFiles(): Promise<string[]> {
  const commitBefore = process.env.GITHUB_EVENT_BEFORE;
  const commitAfter = process.env.GITHUB_SHA || process.env.GITHUB_EVENT_AFTER;

  if (!commitBefore || /^0+$/.test(commitBefore)) {
    return new Promise((resolve, reject) => {
      const command = `git ls-files`;
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing git ls-files: ${stderr}`);
          reject(error);
          return;
        }
        const allFiles = stdout.trim() ? stdout.trim().split("\n") : [];
        console.log("전체 파일 목록:", allFiles);
        resolve(allFiles);
      });
    });
  }
  return new Promise((resolve, reject) => {
    const command = `git diff --name-only ${commitBefore} ${commitAfter}`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing git diff: ${stderr}`);
        reject(error);
        return;
      }
      const changedFiles = stdout.trim() ? stdout.trim().split("\n") : [];
      console.log("Changed files:", changedFiles);
      resolve(changedFiles);
    });
  });
}


export function getCommittedFiles(): string[] {
  try {
    const input = fs.readFileSync(0, 'utf-8');
    const lines = input.trim().split('\n');

    let committedFiles: string[] = [];

    for (const line of lines) {
      const [_, localSha, __, remoteSha] = line.split(' ');

      const isLocalBranch = remoteSha === '0000000000000000000000000000000000000000';
      if (isLocalBranch) {
        const listCommand = `git ls-tree -r --name-only ${localSha}`;
        const output = execSync(listCommand, { encoding: 'utf-8' });
        committedFiles = committedFiles.concat(output.split('\n').filter(file => file.trim() !== ''));
      } else {
        const diffCommand = `git diff --name-only ${remoteSha} ${localSha}`;
        const output = execSync(diffCommand, { encoding: 'utf-8' });
        committedFiles = committedFiles.concat(output.split('\n').filter(file => file.trim() !== ''));
      }
    };

    const uniqueFiles = Array.from(new Set(committedFiles))
    return uniqueFiles;
  } catch (error) {
    console.error('커밋한 파일을 가져오는 중 오류가 발생했습니다.');
    process.exit(1);
  }
}

export function getBranchDiffFiles(branch: string): string[] {
  try {
    const output = execSync(`git diff --name-only ${branch}...HEAD`)
      .toString()
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);
    console.log('Modified files from git diff:', output);
    return output;
  } catch (error) {
    console.error('Failed to get modified files:', error);
    return [];
  }
}