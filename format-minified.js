const ts = require('typescript');
const fs = require('fs');
const path = require('path');

function formatFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  
  // If already properly formatted (many lines), skip
  if (code.split('\n').length > 10) {
    console.log('SKIP:', path.basename(filePath));
    return false;
  }

  // Parse with TypeScript - it handles ASI (missing semicolons)
  const sf = ts.createSourceFile(
    path.basename(filePath),
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  // If parsing failed, try as TS
  if (sf.parseDiagnostics && sf.parseDiagnostics.length > 0) {
    console.log('PARSE ERROR:', path.basename(filePath), sf.parseDiagnostics[0].messageText);
    return false;
  }

  // Use TypeScript's printer to produce formatted output
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: false,
    omitTrailingSemicolon: false,
  });

  // Format with 2-space indent
  const result = printer.printFile(sf);
  
  fs.writeFileSync(filePath, result, 'utf8');
  const lines = result.split('\n').length;
  console.log('DONE:', path.basename(filePath), '->', lines, 'lines');
  return true;
}

const files = process.argv.slice(2);
let count = 0;
let failed = 0;
for (const f of files) {
  if (formatFile(f)) count++;
  else failed++;
}
console.log('\nFormatted:', count, 'Failed:', failed);
