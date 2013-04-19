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

var padString = Array(640 + 1).join(' ');

function pad(s, w) {
  if (w < 0) {
    return padString.slice(s.length, -w) + s;
  } else {
    return s + padString.slice(s.length, w);
  }
}

function columns() {
  var S = '', n = 0, w, s;
  for (var i = 0; i < arguments.length; i += 2) {
    s = pad(arguments[i], w = Number(arguments[i + 1]));
    n += w = Math.abs(w);
    S += s.length > w ? s + '\n' + padString.slice(-n) : s;
  }
  return S;
}

exports.pad = pad;
exports.columns = columns;
