// Copyright 2013 Traceur Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

var Getopt = require('./getopt.js').Getopt;
var sprintf = require('./fmt-util.js').sprintf;
var path = require('path');
var flags;
var cmdName = path.basename(process.argv[1]);

var traceur = require('./traceur.js');

var opts = ['h', 'help', 'o:', 'out:', 'longhelp'];

var mainhelp = [
  ['--help', 'Output usage information', '-h'],
  ['--out <FILE>', 'Compile all input files into a single file', '-o'],
  ['--longhelp', 'Show all known options'],
  ['--experimental', 'Turns on all experimental features'],
  ['--source-maps', 'Generate source maps']
];

var boolopts = [
  'debug',
  'sourceMaps',
  'freeVariableChecker',
  'validate',
  'strictSemicolons',
  'unstarredGenerators',
  'ignoreNolint'
];

function dashCase(s) {
  return s.replace(/([A-Z])/g, '-$1').toLowerCase();
}

var featurehelp = Object.keys(traceur.options).reduce(function(a, x) {
  if (boolopts.indexOf(x) === -1) {
    var dx = dashCase(x);
    opts.push([dx + '::', x]);
    if (x !== 'experimental') {
      a.push(['--' + dx, '[=<true|false|parse>]']);
    }
  }
  return a;
}, []);

var boolhelp = boolopts.reduce(function(a, x) {
  var dx = dashCase(x);
  opts.push([dx, x]);
  if (x !== 'sourceMaps') {
    a.push(['--' + dx]);
  }
  return a;
}, []);

function printOpt(x) {
  var ind = 2;
  var w = 25;
  var shortOpt = x[2] ? x[2] + ',' : '';
  var s = sprintf('%*s%*s%*s', ind, '', -4, shortOpt, -w, x[0]);
  if (x[1]) {
    if (s.length > ind + 4 + w) {
      s += sprintf('\n%*s  %s', ind + 4 + w, '', x[1]);
    } else {
      s += '  ' + x[1];
    }
  }
  console.log(s);
}

function printMainHelp() {
  console.log('Options:\n')
  mainhelp.forEach(printOpt);
}

function printLongHelp() {
  printMainHelp();
  console.log();
  console.log('Feature options:\n')
  featurehelp.forEach(printOpt);

  console.log();
  console.log('Bool options:\n')
  boolhelp.forEach(printOpt);
}

function printExamples() {
  console.log('Examples:');
  console.log('');
  console.log('  $ %s a.js [args]', cmdName);
  console.log('  $ %s --out compiled.js b.js c.js', cmdName);
  console.log('');
};

console.log(opts);

var g = new Getopt(opts);
var flags = Object.create(null);
var interpretMode = true;
var argv = process.argv;
var dashdash =  false;
var errors = false;

console.log(argv);

flags.args = [];
loop:
while (g.getopt(argv)) {
  switch (g.opt) {
    case 'h':
    case 'help':
      printMainHelp();
      console.log();
      printExamples();
      break loop;
    case 'longhelp':
      printLongHelp();
      console.log();
      printExamples();
      break loop;
    case 'o':
    case 'out':
      interpretMode = false;
      flags.out = g.optarg;
      break;
    case '=':
      if (interpretMode || (dashdash = g.optarg === '--')) {
        flags.args.push.apply(flags.args, argv.slice(g.optind + dashdash));
        break loop;
      }
      flags.args.push(g.optarg);
      break;
    default:
      if (g.optdata) {
        traceur.options[g.optdata] = g.optarg === null ? true : g.optarg;
        console.log(g.optdata, traceur.options[g.optdata]);
      }
      break;
    case ':':
    case '?':
    case '!':
      errors = true;
      console.log(g.message());
  }
}
console.log(flags);
if (errors) {
  console.log('had errors');
  process.exit(1);
}
process.exit(0);

var includes = flags.args;

if (!includes.length) {
  // TODO: Start trepl
  console.error('\n  Error: At least one input file is needed');
  flags.help();
  process.exit(1);
}

var interpret = require('./interpreter.js');
var compiler = require('./compiler.js');
var compileToSingleFile = compiler.compileToSingleFile;
var compileToDirectory = compiler.compileToDirectory;

var out = flags.out;
if (out) {
  var isSingleFileCompile = /\.js$/.test(out);
  if (isSingleFileCompile)
    compileToSingleFile(out, includes, flags.sourceMaps);
  else
    compileToDirectory(out, includes, flags.sourceMaps);
} else {
  interpret(includes[0], includes.slice(1), argv.flags);
}
