import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

(function () {
  const files = getStagedFiles();

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


function getStagedFiles(): string[] {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf-8',
    });
    return output.split('\n').map(file => file.trim());
  } catch (error) {
    console.error('수정된 파일을 가져오는 중 오류가 발생했습니다.');
    process.exit(1);
  }
}

/**
 * 소스 파일 경로를 테스트 파일 경로로 변환합니다.
 * 예: project/folder1/folder2/A.vue -> project/tests/folder1/folder2/A.spec.js
 * @param {string} file 소스 파일 경로
 * @returns {string | null} 대응하는 테스트 파일 경로 또는 null
 */
function mapToTestFile(file: string): string | null {
  const srcPrefix = 'project/'; // 소스 파일의 공통 경로가 있다면 수정
  const testsPrefix = 'project/tests/'; // 테스트 파일의 공통 경로

  if (!file.startsWith(srcPrefix)) {
    return null;
  }

  const relativePath = file.slice(srcPrefix.length); // project/ 이후 경로
  const dir = path.dirname(relativePath);
  const ext = path.extname(relativePath);
  const baseName = path.basename(relativePath, ext);

  const testPatterns = [
    `${baseName}.spec.ts`,
    `${baseName}.spec.js`,
    `${baseName}.test.ts`,
    `${baseName}.test.js`,
  ];

  for (const pattern of testPatterns) {
    const testFilePath = path.join(testsPrefix, dir, pattern);
    if (fs.existsSync(testFilePath)) {
      return testFilePath;
    }
  }
  return null;
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
          execSync(`pnpm vitest run ${testFile}`, { stdio: 'inherit' });
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

