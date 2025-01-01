# Pre-push-husky-test-running
> 한글:
- 이 레포지토리는 커밋된 .js, .ts, .vue, .jsx, .tsx 파일에 대응하는 테스트 파일이 존재할 경우, pre-push 훅에서 테스트 스크립트를 자동으로 실행하는 방법을 작성하였습니다.

> English:
- This repository automatically executes test scripts in the pre-push hook when corresponding test files exist for committed .js, .ts, .vue, .jsx, .tsx files.

<br/>



<img src="https://github.com/KumJungMin/test-pre-push-husky/blob/main/public/assets/example.png" />
 
 _테스트에 위배되는 코드를 푸시한다면, 에러를 띄우는 모습_
 
<br/><br/>


## 사전 푸시 테스트 워크플로우 / Pre-Push Testing Workflow
### 1. 코드 커밋 시 테스트 자동 실행 / Automatic Test Execution on Commit
> 한글:
- `.js, .vue, .jsx, .ts` 등의 파일을 커밋할 때, 해당 파일과 연관된 테스트 파일(`*.test.js, *.spec.js, *.test.ts, *.spec.ts`)이 존재하는지 확인합니다.
- 테스트 파일이 선언되어 있으면, 사전 푸시(pre-push) 단계에서 해당 테스트 스크립트가 자동으로 실행되어 코드의 품질과 기능성을 검증합니다.

<br/>

> English:
- When committing files such as `.js, .vue, .jsx, or .ts`, the system checks for corresponding test files (`*.test.js, *.spec.js, *.test.ts, *.spec.ts`).
- If a test file is declared for the committed file, the associated test script is automatically executed during the pre-push stage to verify code quality and functionality.

<br/>

### 2. 사전 푸시 훅 실행 / Pre-Push Hook Execution

> 한글:

- 개발자가 git push 명령어를 실행하면, Git의 pre-push 훅이 트리거됩니다.
- pre-push 훅은 `.husky/pre-push-script.ts` 스크립트를 실행하여, 푸시하려는 커밋들에 포함된 파일들에 대한 테스트를 수행합니다.
- 예를 들어, `project/folder1/folder2/A.vue` 파일이 커밋 목록에 있다면, 시스템은 `project/tests/folder1/folder2/A.spec.js` 또는 `A.test.ts` 등의 테스트 파일이 존재하는지 검사합니다.
- 단, 테스트 파일(`project/tests/folder1/B.spec.js`)이 커밋 목록에 있다면, 테스트 파일이 있다고 간주합니다.

<br/>

- 스크립트는 다음과 같은 과정을 거칩니다:

|단계|설명|
|---|---|
|(1) 변경된 파일 감지|푸시하려는 커밋들에서 변경된 파일들을 감지합니다.|
|(2) 테스트 파일 매핑|각 변경된 파일에 대응하는 테스트 파일을 찾습니다.|
|(3) 테스트 실행|존재하는 테스트 파일을 vitest를 통해 실행합니다.|
|(4) 결과 처리|모든 테스트가 성공하면 푸시를 계속하고, 하나라도 실패하거나 테스트 파일이 없으면 푸시를 중단합니다.|


<br/>

> English:

- When a developer executes the git push command, Git's pre-push hook is triggered.
- The pre-push hook runs the `.husky/pre-push-script.ts` script, which performs tests on the files included in the commits being pushed.
- For example, if the file `project/folder1/folder2/A.vue` is included in the commit list, the system checks whether a corresponding test file like `project/tests/folder1/folder2/A.spec.js` or `A.test.ts` exists.
- However, if a test file (e.g., `project/tests/folder1/B.spec.js`) is included in the commit list, it is considered to have a test file.

<br/>

- The script follows these steps:

Step|	Description
|---|---|
(1) Detect Changed Files|	Identifies files that have been changed in the commits being pushed.
(2) Map to Test Files|	Finds the corresponding test files for each changed file.
(3) Execute Tests|	Runs existing test files using vitest.
(4) Handle Results|	If all tests pass, the push proceeds. If any test fails or a test file is missing, the push is aborted.

<br/>

### 3. 테스트 파일 매핑 규칙 / Test File Mapping Rules
> 한글:
- 소스 파일의 디렉토리 구조를 기반으로 테스트 파일의 경로를 매핑합니다.
- 예를 들어, `project/folder1/folder2/A.vue` 파일은 `project/tests/folder1/folder2/A.spec.ts`, `A.spec.js`, `A.test.ts`, `A.test.js`와 같은 테스트 파일로 매핑됩니다.
- 우선순위는 `*.spec.ts, *.spec.js, *.test.ts, *.test.js` 순서로 설정하여, 존재하는 첫 번째 테스트 파일만 실행되도록 합니다.

<br/>

> English:

- Maps the paths of test files based on the directory structure of the source files.
- For example, the source file `project/folder1/folder2/A.vue` maps to test files like `project/tests/folder1/folder2/A.spec.ts`, `A.spec.js`, `A.test.ts`, or `A.test.js`.
- The priority is set in the order of `*.spec.ts, *.spec.js, *.test.ts, *.test.js`, ensuring that only the first existing test file is executed.

<br/>

### 4. 예시 프로젝트 구조 / Example Project Structure
```css
your-project/
├── project/
│   ├── folder1/
│   │   ├── folder2/
│   │   │   ├── A.vue
│   │   │   └── B.vue
│   └── ...
├── tests/
│   ├── folder1/
│   │   ├── folder2/
│   │   │   ├── A.spec.js
│   │   │   └── B.spec.ts
│   └── ...
├── .husky/
│   ├── pre-push
│   └── pre-push-script.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```
<br/>

### 5. Husky가 작동하지 않을 때 / When Husky Isn't Working
> 한글:

(1) Husky 설치 및 초기화 확인:
- devDependencies에 Husky가 설치되어 있는지 확인합니다.
```bash
pnpm list husky
```

- 설치되지 않았다면, 다음 명령어로 Husky를 설치합니다.
```bash
pnpm add -D husky
```
- prepare 스크립트를 실행하여 Husky를 초기화합니다.
```bash
pnpm run prepare
```

<br/>

(2) Git Hook 파일 확인:
- .husky/pre-push 파일이 존재하고, 올바른 내용이 포함되어 있는지 확인합니다.
```bash
cat .husky/pre-push
```
- 파일이 없거나 내용이 다르다면, 다음과 같이 파일을 생성 및 수정합니다.
```bash
mkdir -p .husky
touch .husky/pre-push
chmod +x .husky/pre-push
```
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm run pre-push
```

<br/>

(3) 실행 권한 부여:

```bash
chmod +x .husky/pre-push
chmod +x .husky/pre-push-script.ts
```
<br/>

(4) 스크립트 독립 실행 테스트:

- 스크립트를 독립적으로 실행하여 오류가 없는지 확인합니다.
```bash
pnpm run pre-push
```

<br/>

> English:

(1) Verify Husky Installation and Initialization:
- Check if Husky is installed in devDependencies.
```bash
pnpm list husky
```

- If not installed, add Husky:
```bash
pnpm add -D husky
```

- Run the prepare script to initialize Husky:
```bash
pnpm run prepare
```

<br/>

(2) Check Git Hook Files:

- Ensure that the .husky/pre-push file exists and contains the correct content.
```bash
cat .husky/pre-push
```
- If the file is missing or incorrect, create and modify it:
```bash
mkdir -p .husky
touch .husky/pre-push
chmod +x .husky/pre-push
```
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm run pre-push
```

<br/>

(3) Set Execute Permissions:

```bash
chmod +x .husky/pre-push
chmod +x .husky/pre-push-script.ts
```

<br/>

(4) Test Script Execution Independently:

- Run the script independently to check for errors.
```bash
pnpm run pre-push
```
