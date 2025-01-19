import fs from 'fs';
import path from 'path';
import { getBranchDiffFiles } from '../helpers/git';

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
  [key: string]: CoverageFileData;
}

const SRC_PREFIX = 'project/';
const TEST_PREFIX = `${SRC_PREFIX}tests/`;
const COVERAGE_METRICS: (keyof CoverageFileData)[] = ['lines', 'functions', 'branches', 'statements'];
const SKIP_UNCHANGED_COVERAGE = true;

let coverageDecreased = false;

function main() {
  const baseCoveragePath = path.join('coverage-develop', 'coverage-summary.json');
  const currentCoveragePath = path.join('coverage-current', 'coverage-summary.json');

  if (!fs.existsSync(baseCoveragePath)) {
    console.error(`Base coverage file not found: ${baseCoveragePath}`);
    process.exit(1);
  }
  if (!fs.existsSync(currentCoveragePath)) {
    console.error(`Current coverage file not found: ${currentCoveragePath}`);
    process.exit(1);
  }

  const baseCoverageContent = fs.readFileSync(baseCoveragePath, 'utf-8');
  const currentCoverageContent = fs.readFileSync(currentCoveragePath, 'utf-8');

  const baseCoverage = JSON.parse(baseCoverageContent) as CoverageSummary;
  const currentCoverage = JSON.parse(currentCoverageContent) as CoverageSummary;

  const diffFiles = getBranchDiffFiles('develop');

  const modifiedFiles = diffFiles.filter((file) => file.startsWith(SRC_PREFIX));

  console.log('Filtered modified files:', modifiedFiles);

  const resultLines: string[] = [];
  resultLines.push('## Coverage Diff Result');
  resultLines.push(`비교 기준: develop branch vs. current branch\n`);

  if (modifiedFiles.length > 0) {
    const result = generateCoverageDiffReport({
      fileList: modifiedFiles,
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
    console.error('Coverage decreased. Merge is blocked.');
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

  for (const file of fileList) {
    const sourceKey = getSourceFileKey(baseCoverageKeys, file);

    const baseFileCoverage = sourceKey ? baseCoverage[sourceKey] || null : null;
    const currentFileCoverage = sourceKey ? currentCoverage[sourceKey]  || null : null;

    for (const metric of COVERAGE_METRICS) {
      const matrix = compareMetricForFile({ file: sourceKey, metric, baseFileCoverage, currentFileCoverage });

      if (matrix) result.push(matrix);
    }
  }

  if (result.length > 0) {
    result.unshift('--- | --- | --- | --- | ---');
    result.unshift('파일 | Metric | develop 커버리지 | current 커버리지 | 비고');
  }

  return result;
}

function getSourceFileKey(coverageKeys: string[], file: string): string {
  const isTestFile = file.startsWith(TEST_PREFIX);

  if (isTestFile) {
    const fileDir = path.dirname(file);
    const fileBase = path.basename(file, path.extname(file)).split('.')[0];
    const formattedFile = path.join(fileDir, fileBase).replace(TEST_PREFIX, SRC_PREFIX);

    const idx = coverageKeys.findIndex((k) => k.includes(formattedFile));

    if (idx > -1) return coverageKeys[idx];  
    else return file;
  } else {
    return file;
  }

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
  const formattedFile = file.split(SRC_PREFIX)[1];
  
  let note = '✅  유지';

  if (currentPct < basePct) {
    note = '⚠️  하락';
    coverageDecreased = true;
  } else if (SKIP_UNCHANGED_COVERAGE) {
    return '';
  }
  return `${formattedFile} | ${metric} | ${basePct}% | ${currentPct}% | ${note}`;
}

main();

