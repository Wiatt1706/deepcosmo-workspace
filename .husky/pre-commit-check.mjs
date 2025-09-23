#!/usr/bin/env node

import { execSync } from "child_process";
import path from "path";

// 移除所有颜色和格式，只保留纯文本
const log = (msg) => console.log(msg);
const info = (msg) => log(`ℹ️  ${msg}`);
const success = (msg) => log(`✅ ${msg}`);
const warning = (msg) => log(`⚠️  ${msg}`);
const error = (msg) => log(`❌ ${msg}`);

// 移除 ANSI 转义序列
const removeAnsiCodes = (str) => {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
};

// 执行命令并返回结果
const exec = (cmd) => {
  try {
    return {
      success: true,
      output: execSync(cmd, { encoding: "utf8", stdio: "pipe" }),
    };
  } catch (e) {
    return {
      success: false,
      error: e.stdout || e.stderr || e.message
    };
  }
};

// 获取暂存文件
const getStagedFiles = () => {
  const result = exec("git diff --cached --name-only --diff-filter=ACM");
  if (!result.success) {
    error("无法获取暂存文件");
    process.exit(1);
  }
  return result.output.trim().split("\n").filter(Boolean);
};

// 文件过滤辅助函数
const filterFiles = (files, exts) =>
  files.filter(file => exts.includes(path.extname(file)));

// 批量执行命令
const batchExec = (files, cmdTemplate, batchSize = 20) => {
  if (files.length === 0) return { success: true };

  if (files.length > batchSize) {
    warning(`文件较多，分批处理 (共 ${files.length} 个文件)...`);
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const result = exec(cmdTemplate(batch));
      if (!result.success) return result;
    }
    return { success: true };
  }

  return exec(cmdTemplate(files));
};

// 简化 TypeScript 错误信息
const simplifyTsErrors = (errorOutput) => {
  const cleanOutput = removeAnsiCodes(errorOutput);
  const lines = cleanOutput.split("\n");
  const errors = [];

  lines.forEach(line => {
    // 匹配 TypeScript 错误格式
    const match = line.match(/([^:]+):(\d+):(\d+) - error (TS\d+): (.+)/);
    if (match) {
      const [, file, lineNum, col, code, message] = match;
      errors.push({
        file: file.trim(),
        line: parseInt(lineNum),
        column: parseInt(col),
        code,
        message: message.trim()
      });
    }
  });

  return errors;
};

// 检查 TypeScript 类型
const checkTypes = () => {
  info("检查类型...");
  const result = exec("npx tsc --noEmit --noErrorTruncation");

  if (!result.success) {
    const errors = simplifyTsErrors(result.error);

    if (errors.length > 0) {
      error(`发现 ${errors.length} 个类型错误:`);

      // 按文件分组显示错误
      const errorsByFile = {};
      errors.forEach(err => {
        if (!errorsByFile[err.file]) errorsByFile[err.file] = [];
        errorsByFile[err.file].push(err);
      });

      Object.keys(errorsByFile).forEach(file => {
        log(`  ${file}`);
        errorsByFile[file].forEach(err => {
          log(`    → 第 ${err.line} 行: ${err.message} (${err.code})`);
        });
      });
    } else {
      error("类型检查失败，但无法解析错误信息");
      console.log(removeAnsiCodes(result.error));
    }

    warning("修复方法: 修复上述类型错误");
    return false;
  }

  return true;
};

// 解析 ESLint 错误
const parseLintErrors = (errorOutput) => {
  const cleanOutput = removeAnsiCodes(errorOutput);
  const lines = cleanOutput.split("\n");
  let currentFile = "";
  let hasErrorLevelIssues = false;
  const errors = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // 跳过总结行
    if (trimmed.includes("✖") || trimmed.includes("Problems:") || trimmed.includes("ESLint found too many warnings")) {
      return;
    }

    // 文件路径行
    if (trimmed.match(/^[A-Za-z]:\\.*\.(ts|tsx|js|jsx)$/) || trimmed.match(/^\.\/.*\.(ts|tsx|js|jsx)$/)) {
      currentFile = trimmed;
      return;
    }

    // 错误行
    const errorMatch = trimmed.match(/^\s*(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+([a-zA-Z-]+)$/);
    if (errorMatch && currentFile) {
      const [, lineNum, col, level, message, rule] = errorMatch;

      // 只处理错误级别的问题
      if (level === "error") {
        errors.push({
          file: currentFile,
          line: parseInt(lineNum),
          column: parseInt(col),
          message,
          rule
        });
        hasErrorLevelIssues = true;
      }
      return;
    }

    // 简化的错误行
    const simpleErrorMatch = trimmed.match(/^\s*(\d+):(\d+)\s+(error|warning)\s+(.+)$/);
    if (simpleErrorMatch && currentFile) {
      const [, lineNum, col, level, message] = simpleErrorMatch;

      if (level === "error") {
        errors.push({
          file: currentFile,
          line: parseInt(lineNum),
          column: parseInt(col),
          message
        });
        hasErrorLevelIssues = true;
      }
      return;
    }
  });

  // 如果有错误，按文件分组显示
  if (errors.length > 0) {
    error(`发现 ${errors.length} 个代码质量问题:`);

    const errorsByFile = {};
    errors.forEach(err => {
      if (!errorsByFile[err.file]) errorsByFile[err.file] = [];
      errorsByFile[err.file].push(err);
    });

    Object.keys(errorsByFile).forEach(file => {
      log(`  ${file}`);
      errorsByFile[file].forEach(err => {
        const ruleInfo = err.rule ? ` (${err.rule})` : '';
        log(`    → 第 ${err.line} 行: ${err.message}${ruleInfo}`);
      });
    });
  }

  return hasErrorLevelIssues;
};

// 检查代码质量
const checkCode = (files) => {
  if (files.length === 0) return true;

  info(`检查代码质量 (${files.length} 个文件)...`);
  const result = batchExec(files, batch => `npx eslint --fix --quiet --no-color ${batch.join(" ")}`);

  if (!result.success) {
    const hasErrors = parseLintErrors(result.error);
    if (hasErrors) {
      error("发现错误级别的问题，提交被阻断");
      warning("修复方法: npm run lint:fix");
      return false;
    }
  }

  return true;
};

// 检查代码格式
const checkFormat = (files) => {
  if (files.length === 0) return true;

  info(`检查代码格式 (${files.length} 个文件)...`);
  const result = batchExec(files, batch => `npx prettier --check --loglevel=warn --no-color ${batch.join(" ")}`);

  if (!result.success) {
    error("格式问题:");

    // 解析 Prettier 错误信息
    const cleanError = removeAnsiCodes(result.error);
    const errorLines = cleanError.split("\n");
    const formatErrors = [];

    errorLines.forEach(line => {
      if (line.includes(".js") || line.includes(".ts") || line.includes(".css") ||
          line.includes(".scss") || line.includes(".json") || line.includes(".md")) {
        formatErrors.push(line.trim());
      }
    });

    if (formatErrors.length > 0) {
      error(`发现 ${formatErrors.length} 个格式问题:`);
      formatErrors.forEach(err => {
        log(`  ${err}`);
      });
    } else {
      log("  代码格式不符合要求");
    }

    warning("修复方法: npm run format");
    return false;
  }

  return true;
};

// 主函数
const main = () => {
  const stagedFiles = getStagedFiles();
  if (stagedFiles.length === 0) {
    info("没有暂存文件");
    process.exit(0);
  }

  const codeFiles = filterFiles(stagedFiles, [".ts", ".tsx", ".js", ".jsx"]);
  const formatFiles = filterFiles(
    stagedFiles,
    [".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".scss", ".md"]
  );

  console.log(""); // 空行分隔

  const hasTypeScript = codeFiles.some(f => f.endsWith(".ts") || f.endsWith(".tsx"));

  let typesPassed = true;
  let codePassed = true;
  let formatPassed = true;

  // 类型检查
  if (hasTypeScript) {
    typesPassed = checkTypes();
    console.log(""); // 空行分隔
  }

  // 代码质量检查
  codePassed = checkCode(codeFiles);
  console.log(""); // 空行分隔

  // 格式检查
  formatPassed = checkFormat(formatFiles);
  console.log(""); // 空行分隔

  if (typesPassed && codePassed && formatPassed) {
    success("所有检查通过，可以提交");
    process.exit(0);
  } else {
    error("检查失败，请修复问题后重试");
    process.exit(1);
  }
};

main();
