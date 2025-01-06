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
  total: CoverageFileData; 
  files: Record<string, CoverageFileData>;
}

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

  const resultLines: string[] = [];
  resultLines.push('## Coverage Diff Result');
  resultLines.push(`비교 기준: develop vs. 현재 브랜치\n`);

  let coverageDecreased = false;

  const filteredDiffFiles = diffFiles?.filter((file) => file.startsWith('project/'));

  // 파일별로 라인 커버리지를 비교
  filteredDiffFiles?.forEach((file) => {
    const baseEntryKey = Object.keys(baseCoverage.files).find((k) => k.endsWith(file));
    const currentEntryKey = Object.keys(currentCoverage.files).find((k) => k.endsWith(file));

    const baseFileCov = baseEntryKey ? baseCoverage.files[baseEntryKey] : null;
    const currentFileCoverage = currentEntryKey ? currentCoverage.files[currentEntryKey] : null;

    const baseLineCoveragePercentage = baseFileCov ? baseFileCov.lines.pct : 0;
    const currentLineCoveragePercentage = currentFileCoverage ? currentFileCoverage.lines.pct : 0;

    let line = `- **${file}**: develop=${baseLineCoveragePercentage}%, current=${currentLineCoveragePercentage}%`;

    if (currentLineCoveragePercentage < baseLineCoveragePercentage) {
      coverageDecreased = true;
      line += `  ⚠️  커버리지 하락`;
    }

    resultLines.push(line);
  });

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
};

main();

