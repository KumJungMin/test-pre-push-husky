import fs from 'fs';
import path from 'path';
import { getPushedFiles } from '../project/helpers/git';

interface CoverageDetails {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
}

interface CoverageFileData {
  lines: CoverageDetails;
  functions: CoverageDetails;
  branches: CoverageDetails;
  statements: CoverageDetails;
}

interface CoverageSummary {
  [key: string]: CoverageFileData
}

const PROJECT_PREFIX = 'project/';
const TEST_PREFIX = `${PROJECT_PREFIX}tests/`;
const COVERAGE_METRICS: (keyof CoverageFileData)[] = ['lines', 'functions', 'branches', 'statements'];
const SKIP_UNCHANGED_COVERAGE = true;

let coverageDecreased = false;

async function main() {
  const baseCoveragePath = path.join('coverage-develop', 'coverage-summary.json');
  const currentCoveragePath = path.join('coverage-current', 'coverage-summary.json');

  if (!fs.existsSync(baseCoveragePath)) {
    console.error(`Base coverage file not found: ${baseCoveragePath}`);
    process.exit(1);
  }
  if (!fs.existsSync(currentCoveragePath)) {
    console.error(`current coverage file not found: ${currentCoveragePath}`);
    process.exit(1);
  }

  const baseCoverageContent = fs.readFileSync(baseCoveragePath, 'utf-8');
  const currentCoverageContent = fs.readFileSync(currentCoveragePath, 'utf-8');

  const baseCoverage = JSON.parse(baseCoverageContent) as CoverageSummary;
  const currentCoverage = JSON.parse(currentCoverageContent) as CoverageSummary;

  const pushedFiles = await getPushedFiles();
  console.log('pushed files:', pushedFiles);
  const modifiedSourceFiles = pushedFiles.map(mapToSourceFile).filter((f): f is string => f !== null);

  console.log('Modified source files:', modifiedSourceFiles);

  const resultLines: string[] = [];
  resultLines.push('## Coverage Diff Result');
  resultLines.push(`비교 기준: develop branch vs. current branch\n`);

  

  if (modifiedSourceFiles.length > 0) {
    const result = generateCoverageDiffReport({
      fileList: modifiedSourceFiles,
      baseCoverage,
      currentCoverage,
    });
    if (result.length > 0) resultLines.push(...result);
    
  } else {
    console.log('No modified files within the target folder.');
  }

  if (!coverageDecreased) {
    resultLines.push(`\n✅ 수정된 파일의 커버리지가 하락하지 않았습니다. Good job!`);
  } else {
    resultLines.push(`\n⚠️  일부 파일에서 커버리지가 감소했습니다. 테스트 보강이 필요할 수 있습니다.`);
  }

  fs.writeFileSync('coverage-diff-result.txt', resultLines.join('\n'), 'utf-8');

  if (coverageDecreased) {
    process.exit(1);
  }
}

function generateCoverageDiffReport({
  fileList,
  baseCoverage,
  currentCoverage,
}: {
  fileList: string[];
  baseCoverage: CoverageSummary;
  currentCoverage: CoverageSummary;
}): string[] {
  const result: string[] = [];
  const baseCoverageKeys = Object.keys(baseCoverage);
  const currentCoverageKeys = Object.keys(currentCoverage);

  for (const file of fileList) {
    const baseEntryKey = baseCoverageKeys.find((k) => k.endsWith(file));
    const currentEntryKey = currentCoverageKeys.find((k) => k.endsWith(file));

    const baseFileCoverage = baseEntryKey ? baseCoverage[baseEntryKey] : null;
    const currentFileCoverage = currentEntryKey ? currentCoverage[currentEntryKey] : null;

    for (const metric of COVERAGE_METRICS) {
      const matrix = compareMetricForFile({ file, metric, baseFileCoverage, currentFileCoverage });

      if (matrix) result.push(matrix);
    }
  };

  if (result.length > 0) {
    result.unshift('--- | --- | --- | --- | ---');
    result.unshift('파일 | Metric | develop 커버리지 | current 커버리지 | 비고');
  }

  return result;
}

function compareMetricForFile({
  file,
  metric,
  baseFileCoverage,
  currentFileCoverage,
}: {
  file: string;
  metric: keyof CoverageFileData;
  baseFileCoverage: CoverageFileData | null;
  currentFileCoverage: CoverageFileData | null;
}): string {
  const basePct = baseFileCoverage ? baseFileCoverage[metric].pct : 0;
  const currentPct = currentFileCoverage ? currentFileCoverage[metric].pct : 0;
  
  let note = '✅  유지';

  if (currentPct < basePct) {
    note = '⚠️  하락';
    coverageDecreased = true;
  } else if (SKIP_UNCHANGED_COVERAGE) {
    return '';
  }
  return `${file} | ${metric} | ${basePct}% | ${currentPct}% | ${note}`;
}

/**
 * 테스트 파일이라면 소스 파일 경로로 변환합니다.
 * 예: project/tests/folder1/folder2/A.spec.js -> project/folder1/folder2/A.vue
 * 
 * @param {string} file 소스 파일 경로
 * @returns {string | null} 대응하는 테스트 파일 경로 또는 null
 */
function mapToSourceFile(file: string): string | null {
  if (!file.startsWith(PROJECT_PREFIX)) {
    return null;
  }

  const testExtensions = ['.spec.js', '.test.js', '.spec.ts', '.test.ts'];
  const isTestFile = testExtensions.some(ext => file.endsWith(ext));

  if (isTestFile) {
    const relativePath = file.slice(TEST_PREFIX.length);
    const dir = path.dirname(relativePath);
    const ext = path.extname(relativePath);
    const baseName = path.basename(relativePath, ext);

    const sourceFile = path.join(PROJECT_PREFIX, dir, baseName + ext);
    return sourceFile;
  } else {
    return file;
  }

}

main();

