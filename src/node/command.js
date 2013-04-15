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

var path = require('path');
var Getopt = require('./getopt.js').Getopt;
var flags = {
  optsMap_: {},
  opts: [],
  option: function(opt, desc) {
    var optinit, m;
    var m = opt.match(/^--([\w\-]+)(?:\s+(\[[^\]]*\]|<[^>]*>))?$/);
    var optinit = m[1] + (m[2] ? (m[2][0] === '[' ? '::' : ':') : '');
    var optInf = [optinit, {o: opt, d: desc}];
    this.optsMap_['--' + m[1]] = optInf;
    this.opts.push([optinit, desc]);
  },
  on: function(opt, func) {
    var optkey = '--' + opt;
    this.optsMap_[optkey] = this.optsMap_[optkey] || {};
    this.optsMap_[optkey].f = func;
  },
  emit: function(opt, val) {
    var optInf = this.optsMap_['--' + opt];
    if (optInf && optInf.f) {
      optInf.f(val);
    }
  },
  usage: function() {}
};
var cmdName = path.basename(process.argv[1]);

var traceur = require('./traceur.js');

flags.option('--out <FILE>', 'Compile all input files into a single file');

flags.option('--sourcemap', 'Generate source maps');
flags.on('sourcemap', function() {
  flags.sourceMaps = traceur.options.sourceMaps = true;
});

flags.option('--longhelp', 'Show all known options');
flags.on('longhelp', function() {
  flags.emit('help');
  process.exit();
});

flags.option('--help', 'Show help');
flags.on('help', function() {
  console.log('  Examples:');
  console.log('');
  console.log('    $ %s a.js', cmdName);
  console.log('    $ %s b.js c.js --out compiled.js', cmdName);
  console.log('');
  process.exit(0);
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
/*
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
      argv.splice(i, 0, '--');
      // Save traceur flags for interpret.js.
      argv.flags = argv.slice(2, i);
      break;
    }
  }
  return argv;
}
*/

var argv = (process.argv);
// flags.parse(argv);

var includes = [];
var interpretMode = true;
var g = new Getopt(flags.opts);
loop:
while (g.getopt(process.argv)) {
  switch (g.opt) {
    case '?':
    case '!':
    case ':':
      console.error('%s error: %s', g.opt, g.optopt);
      process.exit(1);
    case '=':
      if (interpretMode) {
        includes = argv.slice(g.optind - 1);
        argv.flags = argv.slice(2, g.optind - 1);
        break loop;
      }
      includes.push(g.optarg);
      break;
    case 'out':
      interpretMode = false;
      // fall through
    default:
      flags[g.opt] = g.optarg || true;
      flags.emit(g.opt, g.optarg);
  }
}

if (!includes.length) {
  // TODO: Start trepl
  console.error('\n  Error: At least one input file is needed');
  flags.emit('help');
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
