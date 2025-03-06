// Copyright 2019 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package analysis

// StaticcheckAnalzyers describes available Staticcheck analyzers, keyed by
// analyzer name.
var StaticcheckAnalyzers = make(map[string]*Analyzer) // written by analysis_<ver>.go

// TODO
func init() {}
