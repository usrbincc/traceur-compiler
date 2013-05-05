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

var ps = Array(64).join(' ');

function pad(s, w) {
  var sl = s.length;
  if (sl < w) {
    return ps.slice(sl - w) + s;
  }
  if (sl < -w) {
    return s + ps.slice(w + sl);
  }
  return s;
}

function sprintf(fmt) {
  var a = arguments, ai = 1;
  var s = fmt.replace(/%[^%A-z]*[%A-z]/g, function(x) {
    switch(x) {
      case '%%':
        return '%';
      case '%*s':
        var w = a[ai++];
        return pad(String(a[ai++]), w);
      case '%s':
        return String(a[ai++]);
      default:
        throw new Error(sprintf('unknown conversion specification: \'%s\'', x));
    }
  });
  if (ai > a.length) {
    throw new Error('not enough arguments');
  }
  return s;
}

exports.pad = pad;
exports.sprintf = sprintf;
