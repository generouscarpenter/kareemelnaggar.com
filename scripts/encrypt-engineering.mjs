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
const sharedStylesheet = path.join(projectRoot, "style.css");
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
if (!existsSync(sharedStylesheet)) {
  throw new Error(`Shared stylesheet not found: ${sharedStylesheet}`);
}
if (!existsSync(customStyles)) {
  throw new Error(`StatiCrypt UI overrides not found: ${customStyles}`);
}

const outputDirectory = mkdtempSync(path.join(os.tmpdir(), "engineering-staticrypt-"));
const templateFile = path.join(outputDirectory, "password-template.html");
const defaultTemplateContents = readFileSync(defaultTemplate, "utf8");
const css = readFileSync(customStyles, "utf8");
const staticryptContentMarker = '<div id="staticrypt_content" class="staticrypt-content hidden">';
if (!defaultTemplateContents.includes(staticryptContentMarker)) {
  throw new Error("StatiCrypt's password content container was not found.");
}
const staticryptFooterMarker = "            </div>\n        </div>\n\n        <script>";
if (!defaultTemplateContents.includes(staticryptFooterMarker)) {
  throw new Error("StatiCrypt's password content closing marker was not found.");
}
if (!defaultTemplateContents.includes("</head>")) {
  throw new Error("StatiCrypt's default template has no closing head tag.");
}
const passwordFooter = [
  '            <footer class="site-footer">',
  '                <table class="footer-table">',
  "                    <tr>",
  "                        <td>",
  '                            <a href="index.html" class="footer-text staticrypt-footer-text" aria-label="kareem el naggar">kareem el naggar</a>',
  "                        </td>",
  "                    </tr>",
  "                </table>",
  "            </footer>",
];
const passwordFooterScript = [
  "        <script>",
  "            (() => {",
  '                const footer = document.querySelector(".staticrypt-footer-text");',
  "                footer.textContent = `kareem el naggar ${new Date().getFullYear()}`;",
  "                const footerText = footer.textContent;",
  '                footer.textContent = "";',
  "                [...footerText].forEach((char) => {",
  '                    const span = document.createElement("span");',
  '                    span.textContent = char === " " ? "\\u00A0" : char;',
  "                    footer.appendChild(span);",
  "                });",
  "            })();",
  "        </script>",
].join("\n");
const passwordTemplateContents = defaultTemplateContents.replace(
  staticryptFooterMarker,
  `            </div>\n${passwordFooter.join("\n")}\n        </div>\n\n${passwordFooterScript}\n\n        <script>`,
);
writeFileSync(
  templateFile,
  passwordTemplateContents.replace(
    "</head>",
    `        <link rel="stylesheet" href="style.css" />\n        <style>\n${css}\n        </style>\n    </head>`,
  ),
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
