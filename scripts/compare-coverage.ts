import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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

const PROJECT_FOLDER = 'project/';

let coverageDecreased = false;

function main() {
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

  // 수정된 파일 목록 가져오기 (develop...HEAD)
  const diffFiles = getModifiedFiles();

  
  const filteredDiffFiles = diffFiles.filter((file) => file.startsWith(PROJECT_FOLDER));

  console.log('Filtered modified files:', filteredDiffFiles);

  // 5) 결과를 담을 배열
  const resultLines: string[] = [];
  resultLines.push('## Coverage Diff Result');
  resultLines.push(`비교 기준: develop branch vs. current branch\n`);

  

  if (filteredDiffFiles.length > 0) {
    resultLines.push('파일 | develop 커버리지 | current 커버리지 | 비고');
    resultLines.push('--- | --- | --- | ---');

    const result = generateCoverageDiffReport({
      fileList: filteredDiffFiles,
      baseCoverage,
      currentCoverage,
    });
    resultLines.push(...result);
    
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

  result.push('파일 | Metric | develop 커버리지 | current 커버리지 | 비고');
  result.push('--- | --- | --- | --- | ---');

  for (const file of fileList) {
    const baseEntryKey = baseCoverageKeys.find((k) => k.endsWith(file));
    const currentEntryKey = currentCoverageKeys.find((k) => k.endsWith(file));

    const baseFileCoverage = baseEntryKey ? baseCoverage[baseEntryKey] : null;
    const currentFileCoverage = currentEntryKey ? currentCoverage[currentEntryKey] : null;

    const metrics: (keyof CoverageFileData)[] = ['lines', 'functions', 'branches', 'statements'];

    for (const metric of metrics) {
      result.push(compareMetricForFile({ file, metric, baseFileCoverage, currentFileCoverage }));
    }
  };

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
    coverageDecreased = true;
    note = '⚠️  하락';
  }
  
  return `${file} | ${metric} | ${basePct}% | ${currentPct}% | ${note}`;
}


/**
 * Git 명령어를 통해 수정된 파일 목록을 가져옵니다.
 * @returns {string[]} 수정된 파일 목록
 */
function getModifiedFiles(): string[] {
  try {
    const output = execSync('git diff --name-only develop...HEAD')
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

main();

