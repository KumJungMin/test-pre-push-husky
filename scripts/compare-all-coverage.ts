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

  const baseCoverage = loadCoverageFile(baseCoveragePath);
  const currentCoverage = loadCoverageFile(currentCoveragePath);

  const diffFiles = getBranchDiffFiles('develop');
  const modifiedFiles = diffFiles.filter((file) => file.startsWith(SRC_PREFIX));

  const resultLines: string[] = [];
  resultLines.push('## Coverage Diff Result');
  resultLines.push('비교 기준: develop branch vs. current branch\n');

  if (modifiedFiles.length > 0) {
    const diffReport = generateCoverageDiffReport({ fileList: modifiedFiles, baseCoverage, currentCoverage });
    resultLines.push(...diffReport);
  } else {
    console.log('No modified files within the target folder.');
  }

  if (!coverageDecreased) {
    resultLines.push('\n✅ 수정된 파일의 커버리지가 하락하지 않았습니다. Good job!');
  } else {
    resultLines.push('\n⚠️  일부 파일에서 커버리지가 감소했습니다. 테스트 보강이 필요할 수 있습니다.');
  }

  fs.writeFileSync('coverage-diff-result.txt', resultLines.join('\n'), 'utf-8');

  if (coverageDecreased) {
    console.error('Coverage decreased. Merge is blocked.');
    process.exit(1);
  }
}

/** 
 * 파일 경로에 해당하는 커버리지 파일을 읽어 JSON 객체로 반환하는 함수 
 */
function loadCoverageFile(filePath: string): CoverageSummary {
  if (!fs.existsSync(filePath)) {
    console.error(`Coverage file not found: ${filePath}`);
    process.exit(1);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as CoverageSummary;
}

/** 
 * 단일 파일에 대해 각 메트릭의 커버리지 차이를 비교하고 리포트 라인 배열을 반환하는 함수 
 */
function compareCoverageMetricsForFile(
  fileKey: string,
  baseCoverage: CoverageSummary,
  currentCoverage: CoverageSummary
): string[] {
  const result: string[] = [];
  const baseData = baseCoverage[fileKey] || null;
  const currentData = currentCoverage[fileKey] || null;
  const formattedFile = fileKey.split(SRC_PREFIX)[1];

  for (const metric of COVERAGE_METRICS) {
    const basePct = baseData ? baseData[metric].pct : 0;
    const currentPct = currentData ? currentData[metric].pct : 0;
    
    if (SKIP_UNCHANGED_COVERAGE && currentPct >= basePct) {
      continue;
    }

    const note = currentPct < basePct ? '⚠️  하락' : '✅  유지';
    if (currentPct < basePct) coverageDecreased = true;
    result.push(`${formattedFile} | ${metric} | ${basePct}% | ${currentPct}% | ${note}`);
  }
  return result;
}

/** 
 * 전체 파일에 대해 커버리지 차이를 비교하고 리포트를 생성하는 함수 
 */
function generateCoverageDiffReport(params: {
  fileList: string[];
  baseCoverage: CoverageSummary;
  currentCoverage: CoverageSummary;
}): string[] {
  const { fileList, baseCoverage, currentCoverage } = params;
  const result: string[] = [];
  const coverageKeys = Object.keys(baseCoverage);

  for (const file of fileList) {
    const sourceKey = getSourceFileKey(coverageKeys, file);
    const fileReport = compareCoverageMetricsForFile(sourceKey, baseCoverage, currentCoverage);
    result.push(...fileReport);
  }
  if (result.length > 0) {
    result.unshift('파일 | Metric | develop 커버리지 | current 커버리지 | 비고');
    result.splice(1, 0, '--- | --- | --- | --- | ---');
  }
  return result;
}


/** 
 * 테스트 파일의 경로를 소스 파일 경로로 변환하여 coverage 파일의 키와 매칭을 시도하는 함수 
 */
function getSourceFileKey(coverageKeys: string[], file: string): string {
  if (file.startsWith(TEST_PREFIX)) {
    const fileDir = path.dirname(file);
    const fileBase = path.basename(file, path.extname(file)).split('.')[0];
    const formattedFile = path.join(fileDir, fileBase).replace(TEST_PREFIX, SRC_PREFIX);
    const idx = coverageKeys.findIndex((k) => k.includes(formattedFile));

    return idx > -1 ? coverageKeys[idx] : file;
  }
  return file;
}



main();