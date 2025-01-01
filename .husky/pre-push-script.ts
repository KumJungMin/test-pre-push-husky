import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/** 
 * SRC_PREFIX: 소스 파일이 project/src/ 폴더에 있다면 'project/src/'로 설정
 * TEST_PREFIX: 테스트 파일은 SRC_PREFIX를 제외한 경로에 'tests/' 폴더를 추가한 경로로 설정
 * TEST_RUN_SCRIPT: 테스트 실행 스크립트
*/
const SRC_PREFIX = 'project/';
const TEST_PREFIX = `${SRC_PREFIX}tests/`;
const TEST_RUN_SCRIPT = 'pnpm vitest run';

(function () {
  const files = getCommittedFiles();

  if (files.length === 0) {
    console.log('수정된 파일이 없습니다. 푸시를 계속합니다.');
    process.exit(0);
  }

  const hasFailure = runTests(files);

  if (hasFailure) {
    console.error('푸시를 중단합니다. 위의 오류를 확인하세요.');
    process.exit(1);
  }

  console.log('모든 테스트가 성공적으로 통과했습니다. 푸시를 계속합니다.');
  process.exit(0);
})();

function getCommittedFiles(): string[] {
  try {
    const input = fs.readFileSync(0, 'utf-8');
    const lines = input.trim().split('\n');

    let pushedFiles: string[] = [];

    lines.forEach(line => {
      const [_, localSha, __, remoteSha] = line.split(' ');

      const isLocalBranch = remoteSha === '0000000000000000000000000000000000000000';
      if (isLocalBranch) {
        const listCommand = `git ls-tree -r --name-only ${localSha}`;
        const output = execSync(listCommand, { encoding: 'utf-8' });
        pushedFiles = pushedFiles.concat(output.split('\n').filter(file => file.trim() !== ''));
      } else {
        const diffCommand = `git diff --name-only ${remoteSha} ${localSha}`;
        const output = execSync(diffCommand, { encoding: 'utf-8' });
        pushedFiles = pushedFiles.concat(output.split('\n').filter(file => file.trim() !== ''));
      }
    });

    const uniqueFiles = Array.from(new Set(pushedFiles))
    return uniqueFiles;
  } catch (error) {
    console.error('커밋한 파일을 가져오는 중 오류가 발생했습니다.');
    process.exit(1);
  }
}

/**
 * 테스트 파일이 존재하는지 확인하고, 존재하면 테스트를 실행합니다.
 * @param {string[]} files 소스 파일 목록
 * @returns {boolean} 테스트 실패 여부
 */
function runTests(files: string[]): boolean {
  let hasFailure = false;

  for (const file of files) {
    const testFile = mapToTestFile(file);

    if (testFile) {
      if (fs.existsSync(testFile)) {
        console.log(`테스트 실행: ${testFile}`);
        try {
          execSync(`${TEST_RUN_SCRIPT} ${testFile}`, { stdio: 'inherit' });
        } catch (error) {
          console.error(`테스트 실패: ${testFile}`);
          hasFailure = true;
        }
      } else {
        console.error(`테스트 실패: 테스트 파일이 존재하지 않습니다: ${testFile}`);
        hasFailure = true;
      }
    } else {
      console.log(`테스트를 작성해야 합니다: ${file}`);
    }
  }

  return hasFailure;
}

/**
 * 소스 파일 경로를 테스트 파일 경로로 변환합니다.
 * 예: project/folder1/folder2/A.vue -> project/tests/folder1/folder2/A.spec.js
 * @param {string} file 소스 파일 경로
 * @returns {string | null} 대응하는 테스트 파일 경로 또는 null
 */
function mapToTestFile(file: string): string | null {
  const testExtensions = ['.spec.js', '.test.js', '.spec.ts', '.test.ts'];
  const isTestFile = testExtensions.some(ext => file.endsWith(ext));

  if (isTestFile) return file;
  if (!file.startsWith(SRC_PREFIX)) return null;
  
  const relativePath = file.slice(SRC_PREFIX.length);
  const dir = path.dirname(relativePath);
  const ext = path.extname(relativePath);
  const baseName = path.basename(relativePath, ext);

  const testPatterns = testExtensions.map(ext => `${baseName}${ext}`);

  for (const pattern of testPatterns) {
    const testFilePath = path.join(TEST_PREFIX, dir, pattern);
    if (fs.existsSync(testFilePath)) {
      return testFilePath;
    }
  }
  return null;
}
