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

var EventEmitter = require('events').EventEmitter;
var format = require('util').format;
var path = require('path');

var Getopt = require('./getopt.js').Getopt;
var columns = require('./format-util.js').columns;

function Option(flags, description) {
  //            1             2              34         5
  var r = /^(?:-([\w]),\s*)?--([\w\-]+)(?:\s+((<[^>]*>)|(\[[^\]]*\])))?$/;
  var m = flags.match(r);
  this.required = !!m[4];
  this.optional = !!m[5];
  this.long = '--' + m[2];
  this.short = m[1] ? '-' + m[1] : '';
  this.flags = flags;
  this.description = description || '';

  // non-commander properties
  this.arghelp = m[3] || '';
  this.optinitArg = '::'.slice(0, this.required + this.optional * 2);
  this.optinit = m[2] + this.optinitArg;
}

Option.prototype = {
  help: function(w) {
    var short = this.short && this.short + ',';
    var long = this.long + (this.arghelp && ' ' + this.arghelp);
    if (!this.description)
      return columns('', 4, short, 4) + long;
    return columns('', 4, short, 4, long, w) + '  ' + this.description;
  }
};

function Command(cmdName) {
  this.cmdName = cmdName || '';
  this.usageOpts = '';
  this.opts = [];
  this.args = [];
  this.on('help', this.help.bind(this));
  this.options = [];
  this.optionsMap = Object.create(null);
  this.g = null;
}

Command.prototype = {
  __proto__: EventEmitter.prototype,
  option: function(flags, description) {
    var option = new Option(flags, description);
    this.options.push(option);
    this.opts.push([option.optinit, option]);
    if (option.short) {
      this.opts.push([option.short.slice(1) + option.optinitArg, option]);
    }
  },
  optionFor: function(arg) {
    var g = this.getGetopt(), m;
    if (m = arg.match(/^-([\w])|--([\w\-]+)$/)) {
      var argkey = m[1] || m[2];
      // HACK: use private getopt member.
      return g.opts_[argkey] && g.opts_[argkey].data;
    }
  },
  parse: function(argv) {
    this.cmdName = this.cmdName || path.basename(argv[1]);
    // if no help added, add help here.
    var g = this.getGetopt();
    while (g.getopt(argv)) {
      switch (g.opt) {
        case '?':
        case ':':
        case '!':
          console.error('%s: %s', this.cmdName, g.message());
          this.help();
          process.exit(1);
        case '=':
          this.args.push(g.optarg);
          break;
        default:
          if (g.opt === 'help') {
            this.help();
            process.exit(1);
          }
          this[g.opt] = g.optarg !== null ? g.optarg : true;
          this.emit(g.opt);
      }
    }
  },

  // help functions
  help: function() {
    console.log('\n  Usage: %s %s\n', this.cmdName, this.usageOpts);
    this.optionHelp();
    this.emit('--help');
  },
  optionHelp: function() {
    var maxLen = this.options.reduce(function(len, option) {
      var testmax = option.long.length + (option.arghelp.length && option.arghelp.length + 1);
      if (option.description && testmax > len) {
        return testmax;
      }
      return len;
    }, 0);
    // clamp to 20
    maxLen = maxLen < 20 ? maxLen : 20;
    console.log('  Options:\n');
    this.options.forEach(function(option) {
      console.log('%s', option.help(maxLen));
    });
    console.log();
  },
  usage: function(s) {
    this.usageOpts = s;
  },
};

module.exports = exports = new Command();
exports.Option = Option;
exports.Command = Command;
