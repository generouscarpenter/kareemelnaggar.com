import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceFile = path.join(projectRoot, "private", "engineering.html");
const staticryptCli = path.join(projectRoot, "node_modules", "staticrypt", "cli", "index.js");
const defaultTemplate = path.join(
  projectRoot,
  "node_modules",
  "staticrypt",
  "lib",
  "password_template.html",
);
const customStyles = path.join(projectRoot, "staticrypt-overrides.css");

if (!existsSync(sourceFile)) {
  throw new Error(`Private portfolio source not found: ${sourceFile}`);
}
if (!existsSync(staticryptCli)) {
  throw new Error("StatiCrypt is not installed. Run npm install first.");
}
if (!existsSync(defaultTemplate)) {
  throw new Error("StatiCrypt's default password template was not found.");
}
if (!existsSync(customStyles)) {
  throw new Error(`StatiCrypt UI overrides not found: ${customStyles}`);
}

const outputDirectory = mkdtempSync(path.join(os.tmpdir(), "engineering-staticrypt-"));
const templateFile = path.join(outputDirectory, "password-template.html");
const defaultTemplateContents = readFileSync(defaultTemplate, "utf8");
const css = readFileSync(customStyles, "utf8");
if (!defaultTemplateContents.includes("</head>")) {
  throw new Error("StatiCrypt's default template has no closing head tag.");
}
writeFileSync(
  templateFile,
  defaultTemplateContents.replace("</head>", `        <style>\n${css}\n        </style>\n    </head>`),
);

const cliArguments = [
  staticryptCli,
  sourceFile,
  "--directory",
  outputDirectory,
  "--template",
  templateFile,
  "--template-title",
  "password protected",
  "--template-instructions",
  "Enter the password to view my engineering portfolio.",
  "--template-placeholder",
  "password",
  "--template-button",
  "enter",
  "--remember",
  "false",
];
if (process.env.STATICRYPT_ALLOW_SHORT_PASSWORD === "true") {
  cliArguments.push("--short");
}

try {
  execFileSync(process.execPath, cliArguments, {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  });

  const encryptedFile = path.join(outputDirectory, "engineering.html");
  if (!existsSync(encryptedFile)) {
    throw new Error("StatiCrypt did not produce the expected encrypted page.");
  }

  const generatedHtml = readFileSync(encryptedFile, "utf8");
  const unpatchedRememberInput =
    'const password = document.getElementById("staticrypt-password").value,\n' +
    '                    isRememberChecked = document.getElementById("staticrypt-remember").checked;';
  const optionalRememberInput =
    'const password = document.getElementById("staticrypt-password").value,\n' +
    '                    rememberCheckbox = document.getElementById("staticrypt-remember"),\n' +
    "                    isRememberChecked = rememberCheckbox ? rememberCheckbox.checked : false;";
  if (!generatedHtml.includes(unpatchedRememberInput)) {
    throw new Error("StatiCrypt's generated password handler has an unexpected format.");
  }
  writeFileSync(encryptedFile, generatedHtml.replace(unpatchedRememberInput, optionalRememberInput));

  copyFileSync(encryptedFile, path.join(projectRoot, "engineering.html"));
} finally {
  rmSync(outputDirectory, { recursive: true, force: true });
}
