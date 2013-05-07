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
try {
  flags = new (require('commander').Command)(cmdName);
} catch (ex) {
  console.error('Commander.js is required for this to work. To install it ' +
                'run:\n\n  npm install commander\n');
  process.exit(1);
}
flags.setMaxListeners(100);

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

console.log('main options:\n')
mainhelp.forEach(printOpt);

console.log();
console.log('feature options:\n')
featurehelp.forEach(printOpt);

console.log();
console.log('bool options:\n')
boolhelp.forEach(printOpt);

function printExamples() {
  console.log('  Examples:');
  console.log('');
  console.log('    $ %s a.js [args]', cmdName);
  console.log('    $ %s --out compiled.js b.js c.js', cmdName);
  console.log('');
};

console.log(opts);

var g = new Getopt(opts);
var f = Object.create(null);
var interpretMode = true;
var argv = process.argv;
var dashdash =  false;

console.log(argv);

f.args = [];
loop:
while (g.getopt(argv)) {
  switch (g.opt) {
    case 'h':
    case 'help':
      console.log('print help');
      break loop;
    case 'longhelp':
      console.log('print longhelp');
      break loop;
    case 'o':
    case 'out':
      interpretMode = false;
      f.out = g.optarg;
      break;
    case '=':
      if (interpretMode || (dashdash = g.optarg === '--')) {
        f.args.push.apply(f.args, argv.slice(g.optind + dashdash));
        break loop;
      }
      f.args.push(g.optarg);
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
      console.log(g.message());
  }
}
console.log(f);
process.exit(0);

flags.option('--sourcemap', 'Generate source maps');
flags.on('sourcemap', function() {
  flags.sourceMaps = traceur.options.sourceMaps = true;
});

flags.option('--longhelp', 'Show all known options');
flags.on('longhelp', function() {
  flags.help();
  process.exit();
});

traceur.options.addOptions(flags);

flags.usage('[options] [files]');

// Override commander.js's optionHelp to filter out the Traceur feature flags
// from showing up in the help message.
var optionHelp = flags.optionHelp;
flags.optionHelp = function() {
  if (!flags.longhelp) {
    this.options = this.options.filter(function(command) {
      var dashedName = command.long.slice(2);
      return traceur.options.filterOption(dashedName);
    });
  }
  return optionHelp.call(this);
}

/**
 * HACK: Process arguments so that in interpret mode, commander.js only parses
 * the flags, without the file name and anything past that. If an invalid flag
 * is encountered, commander.js error reporting is emulated instead.
 * @param {Array.<string>} argv
 * @return {Array.<string>}
 */
function processArguments(argv) {
  // Preserve the original.
  argv = argv.slice();

  var interpretMode = true;
  for (var i = 2; i < argv.length; i++) {
    var arg = argv[i], index;
    if (arg === '--')
      break;

    // Normalize flags in-place.
    if (arg.length > 2 && arg[0] === '-' && arg[1] !== '-') {
      // TODO: Is this needed at all for traceur?
      arg = arg.slice(1).split('').map(function(flag) {
        return '-' + flag;
      });
      // Insert the normalized flags in argv.
      argv.splice.apply(argv, [i, 1].concat(arg));
      // Grab the first normalized flag and process it as usual.
      arg = argv[i];
    } else if (/^--/.test(arg) && (index = arg.indexOf('=')) !== -1) {
      // Insert the flag argument in argv.
      argv.splice(i + 1, 0, arg.slice(index + 1));
      // Replace the flag with the stripped version and process it as usual.
      arg = argv[i] = arg.slice(0, index);
    }

    var option = flags.optionFor(arg);
    if (option) {
      if (arg === '--out')
        interpretMode = false;

      if (option.required)
        i++;
      else if (option.optional) {
        arg = argv[i + 1];
        if (arg && arg[0] !== '-')
          i++;
      }
    } else if (arg[0] === '-') {
      // HACK: Because commander.js has a flexible policy, this is the only
      // reliable way of reporting invalid flags to the user, and it's limited
      // to the first invalid flag encountered.
      console.log('\n  error: unknown option `%s\'\n', arg);
      process.exit(1);
    } else if (interpretMode) {
      // Add a hint to stop commander.js from parsing following arguments.
      // Note that this means that --out must come before any unknown flag as
      // well as before any filename for it to be used as the out flag.
      argv.splice(i, 0, '--');
      // Save traceur flags for interpret.js.
      argv.flags = argv.slice(2, i);
      break;
    }
  }
  return argv;
}

var argv = processArguments(process.argv);
flags.parse(argv);

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
